import os
import datetime
import firebase_admin
from firebase_admin import credentials, db
from dotenv import load_dotenv

from rest_framework import viewsets, permissions, status, views
from rest_framework.response import Response
from rest_framework.decorators import action
from django.contrib.auth import get_user_model
from rest_framework.exceptions import ValidationError

from .models import Locker, Reservation
from .serializers import LockerSerializer, ReservationSerializer, UserSerializer

# --- 1. LOAD ENVIRONMENT VARIABLES ---
load_dotenv()

# --- 2. FIREBASE INITIALIZATION ---
try:
    if not firebase_admin._apps:
        firebase_config = {
            "type": os.getenv("FIREBASE_TYPE"),
            "project_id": os.getenv("FIREBASE_PROJECT_ID"),
            "private_key_id": os.getenv("FIREBASE_PRIVATE_KEY_ID"),
            "private_key": os.getenv("FIREBASE_PRIVATE_KEY", "").replace('\\n', '\n'),
            "client_email": os.getenv("FIREBASE_CLIENT_EMAIL"),
            "token_uri": "https://oauth2.googleapis.com/token",
        }
        
        cred = credentials.Certificate(firebase_config)
        firebase_admin.initialize_app(cred, {
            'databaseURL': f'https://{os.getenv("FIREBASE_PROJECT_ID")}-default-rtdb.firebaseio.com/' 
        })
        print("Successfully connected to Firebase Realtime Database!")
except Exception as e:
    print(f"Firebase Initialization Error: {e}")

# --- 3. REAL-TIME SYNC HELPER ---
def trigger_realtime_sync():
    try:
        ref = db.reference('locker_sync')
        ref.set({
            'last_update': str(datetime.datetime.now().timestamp())
        })
    except Exception as e:
        print(f"Firebase Sync Error: {e}")

User = get_user_model()

# --- 4. API VIEWS ---

class RegisterView(views.APIView):
    permission_classes = [permissions.AllowAny] 

    def post(self, request):
        username = request.data.get('username')
        password = request.data.get('password')
        email = request.data.get('email')
        name = request.data.get('name')

        if not username or not password:
            return Response({'error': 'Username and password required'}, status=status.HTTP_400_BAD_REQUEST)

        if User.objects.filter(username=username).exists():
            return Response({'error': 'Username already exists'}, status=status.HTTP_400_BAD_REQUEST)

        user = User.objects.create_user(
            username=username, 
            email=email, 
            password=password,
            name=name
        )
        return Response({'message': 'User created successfully!'}, status=status.HTTP_201_CREATED)

class LockerViewSet(viewsets.ModelViewSet):
    queryset = Locker.objects.all()
    serializer_class = LockerSerializer

    def get_permissions(self):
        # Fix: Allow anyone to view lockers to stop the 401 error
        if self.action in ['list', 'retrieve']:
            return [permissions.AllowAny()]
        
        # Admin-only for editing
        if self.action in ['create', 'update', 'partial_update', 'destroy']:
            return [permissions.IsAdminUser()]
            
        return [permissions.IsAuthenticated()]

class ReservationViewSet(viewsets.ModelViewSet):
    serializer_class = ReservationSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        if self.request.user.is_staff:
            return Reservation.objects.all().order_by('-reserved_at')
        return Reservation.objects.filter(user=self.request.user).order_by('-reserved_at')

    def perform_create(self, serializer):
        locker = serializer.validated_data['locker']
        if locker.status != 'available':
            raise ValidationError({'error': 'Locker is already occupied'})
        
        locker.status = 'occupied'
        locker.save()
        
        serializer.save(user=self.request.user)
        trigger_realtime_sync()

    @action(detail=True, methods=['put'])
    def release(self, request, pk=None):
        reservation = self.get_object()
        locker = reservation.locker
        
        if not request.user.is_staff and reservation.user != request.user:
            return Response({'error': 'Unauthorized'}, status=status.HTTP_403_FORBIDDEN)

        if not reservation.is_active:
            return Response({'error': 'Reservation is already inactive'}, status=status.HTTP_400_BAD_REQUEST)

        locker.status = 'available'
        locker.save()
        
        reservation.is_active = False
        reservation.save()
        
        trigger_realtime_sync()
        return Response({'status': 'locker released', 'locker_number': locker.locker_number})

    @action(detail=False, methods=['get'], permission_classes=[permissions.IsAdminUser])
    def recent_releases(self, request):
        released = Reservation.objects.filter(is_active=False).order_by('-reserved_at')[:10]
        serializer = self.get_serializer(released, many=True)
        return Response(serializer.data)
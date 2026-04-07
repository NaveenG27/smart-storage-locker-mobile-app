from rest_framework import serializers
from django.contrib.auth import get_user_model
from .models import Locker, Reservation

User = get_user_model()

class UserSerializer(serializers.ModelSerializer):
    class Meta:
        model = User
        fields = ['id', 'username', 'email', 'name', 'is_staff', 'created_at']

class LockerSerializer(serializers.ModelSerializer):
    class Meta:
        model = Locker
        fields = '__all__'

class ReservationSerializer(serializers.ModelSerializer):
    user_name = serializers.ReadOnlyField(source='user.name')
    user_username = serializers.ReadOnlyField(source='user.username')
    locker_number = serializers.ReadOnlyField(source='locker.locker_number')
    location = serializers.ReadOnlyField(source='locker.location')

    class Meta:
        model = Reservation
        fields = [
            'id', 'user', 'user_name', 'user_username', 
            'locker', 'locker_number', 'location', 
            'reserved_at', 'reserved_until', 'is_active'
        ]
        read_only_fields = ['user']
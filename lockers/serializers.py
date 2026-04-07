from rest_framework import serializers
from django.contrib.auth import get_user_model
from django.utils import timezone
from .models import Locker, Reservation

User = get_user_model()

class UserSerializer(serializers.ModelSerializer):
    class Meta:
        model = User
        # Included 'id' and 'name' which are essential for your mobile profile screen
        fields = ['id', 'username', 'email', 'name', 'is_staff', 'created_at']

class LockerSerializer(serializers.ModelSerializer):
    class Meta:
        model = Locker
        fields = '__all__'

class ReservationSerializer(serializers.ModelSerializer):
    # These ReadOnlyFields are perfect for displaying data in your React Native FlatList
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
        # 'user' is read_only because we set it automatically in the view (perform_create)
        read_only_fields = ['user', 'reserved_at', 'is_active']

    def validate_reserved_until(self, value):
        """
        Check that the reservation end time is in the future.
        """
        if value and value < timezone.now():
            raise serializers.ValidationError("Reservation end time cannot be in the past.")
        return value
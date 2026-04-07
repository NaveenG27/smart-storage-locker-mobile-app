from django.contrib import admin
from .models import Locker, Reservation

@admin.register(Locker)
class LockerAdmin(admin.ModelAdmin):
    list_display = ('locker_number', 'location', 'status')
    list_filter = ('status',)

@admin.register(Reservation)
class ReservationAdmin(admin.ModelAdmin):
    list_display = ('user', 'locker', 'reserved_until', 'is_active')
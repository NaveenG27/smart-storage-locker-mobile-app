from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import LockerViewSet, ReservationViewSet

# Using DefaultRouter for automatic URL routing for lockers and reservations
router = DefaultRouter()
router.register(r'lockers', LockerViewSet)
router.register(r'reservations', ReservationViewSet, basename='reservation')

urlpatterns = [
    # API endpoints for Lockers and Reservations
    path('', include(router.urls)),
]
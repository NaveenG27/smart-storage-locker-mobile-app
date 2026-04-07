from django.contrib import admin
from django.urls import path, include
from django.conf import settings # Add this
from django.conf.urls.static import static # Add this
from rest_framework_simplejwt.views import TokenObtainPairView, TokenRefreshView
from lockers.views import RegisterView

urlpatterns = [
    # 1. Django Admin Interface
    path('admin/', admin.site.urls),

    # 2. JWT Authentication Endpoints
    path('api/auth/login/', TokenObtainPairView.as_view(), name='token_obtain_pair'),
    path('api/auth/refresh/', TokenRefreshView.as_view(), name='token_refresh'),
    path('api/auth/register/', RegisterView.as_view(), name='register'),

    # 3. Locker & Reservation App Endpoints
    path('api/', include('lockers.urls')),
]

# This ensures that static files (like Admin CSS) work correctly
if settings.DEBUG:
    urlpatterns += static(settings.STATIC_URL, document_root=settings.STATIC_ROOT)
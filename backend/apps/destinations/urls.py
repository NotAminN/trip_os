from django.urls import path

from .views import DestinationDetailView, DestinationListCreateView

urlpatterns = [
    path("destinations/", DestinationListCreateView.as_view(), name="destinations"),
    path(
        "destinations/<int:pk>/",
        DestinationDetailView.as_view(),
        name="destination-detail",
    ),
]

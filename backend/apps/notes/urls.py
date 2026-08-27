from django.urls import path

from .views import NoteDetailView, TripNoteListCreateView

urlpatterns = [
    path("trips/<int:trip_pk>/notes/", TripNoteListCreateView.as_view(), name="trip-notes"),
    path("notes/<int:pk>/", NoteDetailView.as_view(), name="note-detail"),
]

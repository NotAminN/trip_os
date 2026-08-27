"""
Seed realistic demo data for local development and demos.

Usage:
    python manage.py seed_demo

Creates/refreshes the demo account `demo@tripos.dev` (password documented in
README — development only) with trips, days, places, activities, expenses,
packing items, notes, weather forecasts, destinations, and notifications.
"""

import datetime as dt

from django.core.management.base import BaseCommand
from django.db import transaction

from apps.activities.models import Activity
from apps.destinations.models import Destination
from apps.expenses.models import Expense
from apps.notes.models import Note
from apps.notifications.services.notification_service import notify
from apps.packing.models import PackingItem
from apps.places.models import Place
from apps.trips.services.trip_service import create_trip
from apps.users.models import User
from apps.weather.models import WeatherForecast

DEMO_EMAIL = "demo@tripos.dev"
DEMO_PASSWORD = "Demo-Passw0rd!123"

TODAY = dt.date.today()


def d(days_from_today: int) -> dt.date:
    return TODAY + dt.timedelta(days=days_from_today)


class Command(BaseCommand):
    help = "Seed demo data for the Trip OS development environment."

    @transaction.atomic
    def handle(self, *args, **options):
        demo = self._ensure_user()
        self._wipe_existing(demo)
        self._seed_destinations()

        istanbul = self._trip_istanbul(demo)
        shiraz = self._trip_shiraz(demo)
        kish = self._trip_kish(demo)

        self._seed_weather(istanbul)
        self._seed_notifications(demo, shiraz)

        self.stdout.write(self.style.SUCCESS("Demo data seeded successfully."))
        self.stdout.write(f"  login: {DEMO_EMAIL} / {DEMO_PASSWORD}")

    # ------------------------------------------------------------------ users

    def _ensure_user(self) -> User:
        user, created = User.objects.get_or_create(
            email=DEMO_EMAIL,
            defaults={"username": "demo", "first_name": "دمو", "last_name": "کاربر"},
        )
        if created:
            user.set_password(DEMO_PASSWORD)
            user.save()
        return user

    def _wipe_existing(self, user: User) -> None:
        # Trips cascade to members/days/places/activities/expenses/packing/notes/weather.
        for trip in user.trips.all():
            trip.delete()
        user.notifications.all().delete()
        self.stdout.write("Cleared previous demo data for this user.")

    # ----------------------------------------------------------- destinations

    DESTINATIONS = [
        ("استانبول", "ترکیه", "بهار و پاییز", 3500000, 5,
         "شهری بین دو قاره با بازارها، مساجد تاریخی و غذاهای معروف."),
        ("شیراز", "ایران", "اردیبهشت", 2200000, 4,
         "شهر شعر و باغ‌های تاریخی؛ حافظیه و تخت جمشید در نزدیکی."),
        ("کیش", "ایران", "زمستان", 4000000, 3,
         "جزیرهٔ تفریحی خلیج فارس با ساحل مرجانی و مراکز خرید."),
        ("کاپادوکیه", "ترکیه", "تابستان", 4200000, 3,
         "منظره‌های رویایی بالن‌سواری و هتل‌های صخره‌ای."),
    ]

    def _seed_destinations(self):
        for name, country, season, cost, days, description in self.DESTINATIONS:
            Destination.objects.update_or_create(
                name=name,
                defaults={
                    "country": country,
                    "best_season": season,
                    "estimated_daily_cost": cost,
                    "recommended_days": days,
                    "description": description,
                },
            )

    # ------------------------------------------------------------------ trips

    def _trip_istanbul(self, owner):
        trip = create_trip(
            owner=owner,
            title="سفر استانبول",
            destination="Istanbul",
            country="Turkey",
            description="پنج روز گشت‌وگذار بین دو قاره.",
            start_date=d(-30),
            end_date=d(-26),
            travelers_count=2,
            budget=45000000,
            status="completed",
        )
        days = list(trip.days.order_by("day_number"))

        plan = {
            1: [("مسجد آبی", "attraction", 41.0054, 28.9768, 0),
                ("میدان سلطان احمد", "attraction", 41.0057, 28.9772, 1)],
            2: [("موزه توپکاپی", "museum", 41.0115, 28.9846, 0),
                ("بازار بزرگ", "shopping", 41.0108, 28.9639, 1)],
            3: [("گالاتا تاور", "attraction", 41.0256, 28.9744, 0)],
            4: [("پارک گلخانه", "nature", 41.0424, 29.0086, 0)],
        }
        for day_number, entries in plan.items():
            day = days[day_number - 1]
            for order, (name, category, lat, lng, position) in enumerate(entries):
                place = Place.objects.create(
                    trip=trip, day=day, name=name, category=category,
                    latitude=lat, longitude=lng, address=f"Istanbul #{order}",
                    estimated_cost=800000, currency="IRR",
                    start_time=f"{10 + order}:00",
                    end_time=f"{13 + order}:00", duration_minutes=180,
                    position=position,
                )
                Activity.objects.create(
                    trip=trip, day=day, place=place,
                    title=f"بازدید از {name}", category="culture",
                    completed=True, cost=800000, position=position,
                    duration_minutes=120,
                )
            Expense.objects.create(
                trip=trip, day=day, category="food",
                title=f"ناهار روز {day_number}", amount=1500000 + day_number * 200000,
                expense_date=day.date, created_by=owner,
            )
            Note.objects.create(
                trip=trip, day=day,
                title=f"یادداشت روز {day_number}",
                content="مترو بخرید؛ تاکسی‌های توریستی گران هستند.",
                created_by=owner,
            )
        Expense.objects.create(
            trip=trip, category="accommodation", title="هتل سلطان‌احمد",
            amount=12000000, expense_date=d(-30), created_by=owner,
        )

        packing_specs = [
            ("clothing", "کتونی راحت", 1, True),
            ("documents", "پاسپورت", 2, True),
            ("electronics", "شارژر نوع C", 2, True),
            ("personal", "لوازم بهداشتی", 1, True),
            ("travel", "کارت بانکی", 2, True),
            ("other", "چتر", 1, False),
        ]
        for category, name, qty, packed in packing_specs:
            PackingItem.objects.create(
                trip=trip, category=category, name=name,
                quantity=qty, is_packed=packed,
            )
        return trip

    def _trip_shiraz(self, owner):
        trip = create_trip(
            owner=owner,
            title="سفر شیراز",
            destination="Shiraz",
            country="Iran",
            description="چهار روز شعر، باغ و تاریخ.",
            start_date=d(10),
            end_date=d(13),
            travelers_count=3,
            budget=28000000,
            status="planning",
        )
        days = list(trip.days.order_by("day_number"))
        hafezieh = Place.objects.create(
            trip=trip, day=days[0], name="حافظیه", category="attraction",
            latitude=29.6259, longitude=52.5583,
            address="شیراز، خیابان حافظیه", estimated_cost=500000, position=0,
        )
        Place.objects.create(
            trip=trip, day=days[0], name="بازار وکیل", category="shopping",
            address="شیراز، مرکز شهر", estimated_cost=1000000, position=1,
        )
        Activity.objects.create(
            trip=trip, day=days[0], place=hafezieh,
            title="غروب در حافظیه", category="culture", completed=False, position=0,
        )
        Expense.objects.create(
            trip=trip, category="tickets", title="بلیط قطار",
            amount=4500000, expense_date=TODAY, created_by=owner,
        )
        PackingItem.objects.create(trip=trip, category="documents", name="بلیط قطار", quantity=3)
        PackingItem.objects.create(trip=trip, category="clothing", name="عینک آفتابی", quantity=3)
        Note.objects.create(
            trip=trip, content="تخت جمشید را برای روز سوم گذاشتیم؛ کرم ضدآفتاب یادت نره!",
            created_by=owner,
        )
        return trip

    def _trip_kish(self, owner):
        return create_trip(
            owner=owner,
            title="آخر هفته کیش",
            destination="Kish",
            country="Iran",
            description="دو روز دریا و دوچرخه.",
            start_date=d(35),
            end_date=d(36),
            travelers_count=2,
            budget=15000000,
            status="planning",
        )

    # ------------------------------------------------------- weather & notify

    CONDITIONS = ["sunny", "partly_cloudy", "cloudy", "rain"]

    def _seed_weather(self, trip):
        for offset in range(trip.days_count):
            date = trip.start_date + dt.timedelta(days=offset)
            WeatherForecast.objects.update_or_create(
                trip=trip,
                date=date,
                defaults={
                    "day": trip.days.filter(date=date).first(),
                    "temperature_high": 24 + (offset % 3) * 2,
                    "temperature_low": 15 + (offset % 2) * 2,
                    "condition": self.CONDITIONS[offset % len(self.CONDITIONS)],
                    "wind_speed": 8 + offset * 3,
                    "humidity": 55 - offset * 5,
                    "sunrise": dt.time(6, 20),
                    "sunset": dt.time(19, 40),
                },
            )

    def _seed_notifications(self, user, upcoming_trip):
        notify(
            user, type_="trip", title="سفر شیراز نزدیک است!",
            message="۱۰ روز تا شروع سفر؛ چک‌لیست را کامل کن.", trip=upcoming_trip,
        )
        notify(
            user, type_="packing", title="۳ قلم جا مانده",
            message="در چک‌لیست «سفر شیراز» چند مورد هنوز بسته نشده.", trip=upcoming_trip,
        )
        notification = notify(
            user, type_="system", title="خوش آمدی به Trip OS 👋",
            message="اولین سفرت را بساز و برنامه‌ریزی را شروع کن.",
        )
        notification.mark_read()

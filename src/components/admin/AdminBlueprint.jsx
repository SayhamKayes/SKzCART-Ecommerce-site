import { useState } from "react";
import { Copy, Check, Layers, Database, Cpu, Container } from "lucide-react";
import { useLanguage } from "../../Context/LanguageContext";

const AdminBlueprint = () => {
  const { isEnglish } = useLanguage();
  const [activeCodeTab, setActiveCodeTab] = useState("models");
  const [copiedKey, setCopiedKey] = useState(null);
  const copyCode = (code, key) => {
    navigator.clipboard.writeText(code);
    setCopiedKey(key);
    setTimeout(() => setCopiedKey(null), 2e3);
  };
  const dockerComposeCode = `version: '3.8'

services:
  db:
    image: postgres:16-alpine
    container_name: amardokan_postgres
    restart: always
    environment:
      POSTGRES_DB: amardokan_db
      POSTGRES_USER: amardokan_user
      POSTGRES_PASSWORD: secret_postgres_password
    volumes:
      - postgres_data:/var/lib/postgresql/data
    ports:
      - "5432:5432"

  redis:
    image: redis:7-alpine
    container_name: amardokan_redis
    restart: always
    ports:
      - "6379:6379"

  backend:
    build: ./backend
    container_name: amardokan_django
    restart: always
    command: python manage.py runserver 0.0.0.0:8000
    volumes:
      - ./backend:/app
    environment:
      - DATABASE_URL=postgres://amardokan_user:secret_postgres_password@db:5432/amardokan_db
      - REDIS_URL=redis://redis:6379/0
      - CELERY_BROKER_URL=redis://redis:6379/0
    depends_on:
      - db
      - redis
    ports:
      - "8000:8000"

  celery_worker:
    build: ./backend
    container_name: amardokan_celery_worker
    command: celery -A core worker --loglevel=info --concurrency=4
    volumes:
      - ./backend:/app
    depends_on:
      - backend
      - redis
      - db

  celery_beat:
    build: ./backend
    container_name: amardokan_celery_beat
    command: celery -A core beat --loglevel=info
    volumes:
      - ./backend:/app
    depends_on:
      - redis
      - backend

volumes:
  postgres_data:`;
  const djangoModelsCode = `# backend/orders/models.py
from django.db import models
from django.contrib.auth import get_user_model
import uuid

User = get_user_model()

class OrderStatus(models.TextChoices):
    PENDING = 'PENDING', 'Pending Confirmation'
    CONFIRMED = 'CONFIRMED', 'Confirmed'
    COURIER_CREATED = 'COURIER_CREATED', 'Courier Created'
    PICKED_UP = 'PICKED_UP', 'Picked Up'
    IN_TRANSIT = 'IN_TRANSIT', 'In Transit'
    OUT_FOR_DELIVERY = 'OUT_FOR_DELIVERY', 'Out for Delivery'
    DELIVERED = 'DELIVERED', 'Delivered'
    CANCELLED = 'CANCELLED', 'Cancelled'
    RETURNED = 'RETURNED', 'Returned'

class PaymentMethod(models.TextChoices):
    COD = 'COD', 'Cash On Delivery'
    BKASH = 'BKASH', 'bKash Merchant'
    NAGAD = 'NAGAD', 'Nagad'
    ROCKET = 'ROCKET', 'Rocket'
    SSLCOMMERZ = 'SSLCOMMERZ', 'SSLCOMMERZ'

class Order(models.Model):
    id = models.CharField(primary_key=True, max_length=32, editable=False)
    customer_name = models.CharField(max_length=150)
    customer_phone = models.CharField(max_length=15, db_index=True)
    district = models.CharField(max_length=100, db_index=True)
    thana = models.CharField(max_length=100)
    full_address = models.TextField()
    order_note = models.TextField(blank=True, null=True)

    subtotal = models.DecimalField(max_digits=12, decimal_places=2)
    delivery_fee = models.DecimalField(max_digits=8, decimal_places=2)
    discount = models.DecimalField(max_digits=8, decimal_places=2, default=0)
    total = models.DecimalField(max_digits=12, decimal_places=2)

    payment_method = models.CharField(max_length=20, choices=PaymentMethod.choices, default=PaymentMethod.COD)
    payment_status = models.CharField(max_length=20, default='UNPAID')
    status = models.CharField(max_length=30, choices=OrderStatus.choices, default=OrderStatus.PENDING, db_index=True)

    risk_score = models.IntegerField(default=0)
    risk_factors = models.JSONField(default=list, blank=True)

    utm_source = models.CharField(max_length=100, blank=True, null=True)
    utm_campaign = models.CharField(max_length=100, blank=True, null=True)

    created_at = models.DateTimeField(auto_now_add=True, db_index=True)
    updated_at = models.DateTimeField(auto_now=True)

    def __str__(self):
        return f"Order #{self.id} - {self.customer_name}"

class OrderItem(models.Model):
    order = models.ForeignKey(Order, related_name='items', on_delete=models.CASCADE)
    product_id = models.CharField(max_length=64)
    name = models.CharField(max_length=255)
    sku = models.CharField(max_length=64)
    variant = models.CharField(max_length=100, blank=True, null=True)
    price = models.DecimalField(max_digits=10, decimal_places=2)
    quantity = models.PositiveIntegerField(default=1)

class CourierShipment(models.Model):
    order = models.OneToOneField(Order, related_name='courier_shipment', on_delete=models.CASCADE)
    provider = models.CharField(max_length=50) # 'pathao', 'steadfast', 'redx'
    tracking_id = models.CharField(max_length=100, unique=True, db_index=True)
    consignment_id = models.CharField(max_length=100)
    cod_amount = models.DecimalField(max_digits=10, decimal_places=2)
    courier_status = models.CharField(max_length=50, default='in_transit')
    assigned_rider_name = models.CharField(max_length=100, blank=True, null=True)
    assigned_rider_phone = models.CharField(max_length=20, blank=True, null=True)
    created_at = models.DateTimeField(auto_now_add=True)`;
  const pythonAdaptersCode = `# backend/courier/adapters.py
from abc import ABC, abstractmethod
import requests
from django.conf import settings

class ICourierAdapter(ABC):
    @abstractmethod
    def create_shipment(self, order, weight_kg, cod_amount, instructions=None):
        pass

    @abstractmethod
    def track_shipment(self, tracking_id):
        pass

    @abstractmethod
    def handle_webhook(self, payload):
        pass

class SteadfastCourierAdapter(ICourierAdapter):
    BASE_URL = "https://portal.steadfast.com.bd/api/v1"

    def __init__(self):
        self.api_key = settings.STEADFAST_API_KEY
        self.secret_key = settings.STEADFAST_SECRET_KEY

    def create_shipment(self, order, weight_kg, cod_amount, instructions=None):
        headers = {
            "Api-Key": self.api_key,
            "Secret-Key": self.secret_key,
            "Content-Type": "application/json"
        }
        data = {
            "invoice": order.id,
            "recipient_name": order.customer_name,
            "recipient_phone": order.customer_phone,
            "recipient_address": f"{order.full_address}, {order.thana}, {order.district}",
            "cod_amount": float(cod_amount),
            "note": instructions or ""
        }
        response = requests.post(f"{self.BASE_URL}/create_order", json=data, headers=headers)
        res_json = response.json()
        return {
            "tracking_id": res_json.get("consignment", {}).get("tracking_code"),
            "consignment_id": str(res_json.get("consignment", {}).get("consignment_id"))
        }

    def handle_webhook(self, payload):
        # Maps Steadfast delivery status to internal OrderStatus
        status_map = {
            "delivered": "DELIVERED",
            "cancelled": "CANCELLED",
            "in_review": "IN_TRANSIT"
        }
        return status_map.get(payload.get("status"), "IN_TRANSIT")`;
  const celeryTasksCode = `# backend/orders/tasks.py
from celery import shared_task
from .models import Order, OrderStatus, CourierShipment
from courier.factory import get_courier_adapter
from notifications.sms import send_sms
from notifications.whatsapp import send_whatsapp_template
import logging

logger = logging.getLogger(__name__)

@shared_task(bind=True, max_retries=3)
def dispatch_courier_shipment_task(self, order_id, provider_name, weight_kg, cod_amount):
    try:
        order = Order.objects.get(id=order_id)
        adapter = get_courier_adapter(provider_name)
        result = adapter.create_shipment(order, weight_kg, cod_amount)

        CourierShipment.objects.create(
            order=order,
            provider=provider_name,
            tracking_id=result['tracking_id'],
            consignment_id=result['consignment_id'],
            cod_amount=cod_amount,
            courier_status='in_transit'
        )
        order.status = OrderStatus.COURIER_CREATED
        order.save()

        # Trigger Customer SMS
        send_order_sms_task.delay(order.id, 'COURIER_ASSIGNED')
        return result['tracking_id']
    except Exception as exc:
        logger.error(f"Error dispatching courier for order {order_id}: {exc}")
        raise self.retry(exc=exc, countdown=60)

@shared_task
def send_order_sms_task(order_id, template_type):
    order = Order.objects.get(id=order_id)
    send_sms(order.customer_phone, template_type, order)

@shared_task
def meta_capi_purchase_event_task(order_id, event_id):
    order = Order.objects.get(id=order_id)
    # Sends server-side Purchase event with event_id matching browser Pixel`;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-white rounded-3xl p-6 border border-neutral-200 shadow-xs flex flex-wrap items-center justify-between gap-4">
        <div>
          <span className="text-xs font-bold uppercase tracking-wider text-emerald-700 bg-emerald-50 px-2.5 py-1 rounded-full">
            {"System Architecture & Dev Blueprint"}
          </span>
          <h1 className="text-2xl font-black text-neutral-900 mt-2">
            Django + PostgreSQL + Celery {"Architecture Blueprint"}
          </h1>
          <p className="text-xs text-neutral-500">
            {"Modular adapter pattern, Docker containers, and background Celery task queues production code."}
          </p>
        </div>
      </div>

      {/* Tech Stack Pillars */}
      <div className="grid grid-cols-1 sm:grid-cols-4 gap-4 text-xs">
        <div className="p-4 rounded-2xl bg-white border border-neutral-200 shadow-xs flex items-center gap-3">
          <div className="p-2.5 rounded-xl bg-emerald-50 text-emerald-600">
            <Layers className="w-5 h-5" />
          </div>
          <div>
            <span className="font-bold text-neutral-900 block">Django REST Framework</span>
            <span className="text-[11px] text-neutral-500">Python 3.12 Backend</span>
          </div>
        </div>

        <div className="p-4 rounded-2xl bg-white border border-neutral-200 shadow-xs flex items-center gap-3">
          <div className="p-2.5 rounded-xl bg-blue-50 text-blue-600">
            <Database className="w-5 h-5" />
          </div>
          <div>
            <span className="font-bold text-neutral-900 block">PostgreSQL 16 DB</span>
            <span className="text-[11px] text-neutral-500">ACID Transactions</span>
          </div>
        </div>

        <div className="p-4 rounded-2xl bg-white border border-neutral-200 shadow-xs flex items-center gap-3">
          <div className="p-2.5 rounded-xl bg-rose-50 text-rose-600">
            <Cpu className="w-5 h-5" />
          </div>
          <div>
            <span className="font-bold text-neutral-900 block">Redis & Celery Queue</span>
            <span className="text-[11px] text-neutral-500">{"Async SMS & Courier Webhooks"}</span>
          </div>
        </div>

        <div className="p-4 rounded-2xl bg-white border border-neutral-200 shadow-xs flex items-center gap-3">
          <div className="p-2.5 rounded-xl bg-neutral-100 text-neutral-800">
            <Container className="w-5 h-5" />
          </div>
          <div>
            <span className="font-bold text-neutral-900 block">Docker Deployment</span>
            <span className="text-[11px] text-neutral-500">Full Stack Compose</span>
          </div>
        </div>
      </div>

      {/* Code Viewer Panel */}
      <div className="bg-neutral-900 rounded-3xl overflow-hidden border border-neutral-800 shadow-xl">
        {/* Navigation Tabs */}
        <div className="p-4 bg-neutral-950 border-b border-neutral-800 flex flex-wrap items-center justify-between gap-3 text-xs">
          <div className="flex items-center gap-2">
            <button
              onClick={() => setActiveCodeTab("models")}
              className={`px-3 py-1.5 rounded-xl font-bold transition-all cursor-pointer ${
                activeCodeTab === "models"
                  ? "bg-emerald-600 text-white"
                  : "text-neutral-400 hover:text-white hover:bg-neutral-800"
              }`}
            >
              Django Models (models.py)
            </button>

            <button
              onClick={() => setActiveCodeTab("adapters")}
              className={`px-3 py-1.5 rounded-xl font-bold transition-all cursor-pointer ${
                activeCodeTab === "adapters"
                  ? "bg-emerald-600 text-white"
                  : "text-neutral-400 hover:text-white hover:bg-neutral-800"
              }`}
            >
              Courier Adapters (adapters.py)
            </button>

            <button
              onClick={() => setActiveCodeTab("celery")}
              className={`px-3 py-1.5 rounded-xl font-bold transition-all cursor-pointer ${
                activeCodeTab === "celery"
                  ? "bg-emerald-600 text-white"
                  : "text-neutral-400 hover:text-white hover:bg-neutral-800"
              }`}
            >
              Celery Tasks (tasks.py)
            </button>

            <button
              onClick={() => setActiveCodeTab("docker")}
              className={`px-3 py-1.5 rounded-xl font-bold transition-all cursor-pointer ${
                activeCodeTab === "docker"
                  ? "bg-emerald-600 text-white"
                  : "text-neutral-400 hover:text-white hover:bg-neutral-800"
              }`}
            >
              docker-compose.yml
            </button>
          </div>

          <button
            onClick={() => {
              const codeMap = {
                models: djangoModelsCode,
                adapters: pythonAdaptersCode,
                celery: celeryTasksCode,
                docker: dockerComposeCode,
              };
              copyCode(codeMap[activeCodeTab], activeCodeTab);
            }}
            className="py-1.5 px-3 rounded-lg bg-neutral-800 hover:bg-neutral-700 text-neutral-300 hover:text-white font-semibold flex items-center gap-1.5 transition-colors cursor-pointer"
          >
            {copiedKey === activeCodeTab ? (
              <>
                <Check className="w-3.5 h-3.5 text-emerald-400" />
                <span>{"Copied"}</span>
              </>
            ) : (
              <>
                <Copy className="w-3.5 h-3.5" />
                <span>{"Copy Code"}</span>
              </>
            )}
          </button>
        </div>

        {
    /* Code Content */
  }
        <div className="p-6 overflow-x-auto max-h-[500px] overflow-y-auto">
          <pre className="font-mono text-xs text-neutral-200 leading-relaxed">
            {activeCodeTab === "models" && djangoModelsCode}
            {activeCodeTab === "adapters" && pythonAdaptersCode}
            {activeCodeTab === "celery" && celeryTasksCode}
            {activeCodeTab === "docker" && dockerComposeCode}
          </pre>
        </div>
      </div>
    </div>
  );
};
export {
  AdminBlueprint
};

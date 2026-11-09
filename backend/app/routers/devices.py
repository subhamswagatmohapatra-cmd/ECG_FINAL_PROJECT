from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select
from typing import List
from datetime import datetime, timezone
import random

from app.database import get_db
from app.models import User, Patient, Device, HeartRateReading, AuditLog
from app.schemas import DeviceRegister, DeviceOut
from app.routers.auth import get_current_user

router = APIRouter(prefix="/devices", tags=["devices"])

@router.get("", response_model=List[DeviceOut])
async def list_devices(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """List registered devices for the current patient."""
    pat_stmt = select(Patient).where(Patient.user_id == current_user.id)
    pat_res = await db.execute(pat_stmt)
    patient = pat_res.scalar_one_or_none()
    if not patient:
        raise HTTPException(status_code=400, detail="Patient profile not found.")
        
    stmt = select(Device).where(Device.patient_id == patient.id, Device.is_active == True)
    res = await db.execute(stmt)
    return res.scalars().all()

@router.post("", response_model=DeviceOut)
async def register_device(
    payload: DeviceRegister,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """Pair and register a new wearable or medical sensor."""
    pat_stmt = select(Patient).where(Patient.user_id == current_user.id)
    pat_res = await db.execute(pat_stmt)
    patient = pat_res.scalar_one_or_none()
    if not patient:
        raise HTTPException(status_code=400, detail="Patient profile not found.")
        
    new_dev = Device(
        patient_id=patient.id,
        device_name=payload.device_name,
        device_type=payload.device_type,
        serial_number=payload.serial_number,
        mac_address=payload.mac_address or f"E4:5F:01:{random.randint(10,99)}:{random.randint(10,99)}:{random.randint(10,99)}",
        connection_status="connected",
        battery_level=random.randint(85, 100),
        firmware_version=payload.firmware_version or "v2.4.1",
        is_active=True
    )
    db.add(new_dev)
    
    audit = AuditLog(
        user_id=current_user.id,
        action="REGISTER_DEVICE",
        resource_type="device",
        details={"name": payload.device_name, "type": payload.device_type}
    )
    db.add(audit)
    
    await db.commit()
    await db.refresh(new_dev)
    return new_dev

@router.post("/{device_id}/sync")
async def sync_device(
    device_id: int,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """Synchronize latest background vitals from registered device."""
    pat_stmt = select(Patient).where(Patient.user_id == current_user.id)
    pat_res = await db.execute(pat_stmt)
    patient = pat_res.scalar_one_or_none()
    if not patient:
        raise HTTPException(status_code=400, detail="Patient profile not found.")
        
    stmt = select(Device).where(Device.id == device_id, Device.patient_id == patient.id)
    res = await db.execute(stmt)
    dev = res.scalar_one_or_none()
    if not dev:
        raise HTTPException(status_code=404, detail="Device not found.")
        
    dev.last_sync_time = datetime.now(timezone.utc)
    dev.battery_level = max(10, dev.battery_level - random.randint(0, 2))
    dev.connection_status = "connected"
    
    # Generate realistic resting reading from device sync
    simulated_bpm = 70 + random.randint(-4, 6)
    new_reading = HeartRateReading(
        patient_id=patient.id,
        bpm=simulated_bpm,
        resting_status="resting",
        measurement_method="simulated_wearable",
        device_name=f"{dev.device_name} (Sync)",
        notes=f"Auto-synchronized from {dev.device_name} via Health Ingestion Service"
    )
    db.add(new_reading)
    await db.commit()
    await db.refresh(new_reading)
    
    return {
        "status": "success",
        "synced_reading": {
            "id": new_reading.id,
            "bpm": new_reading.bpm,
            "device": dev.device_name,
            "sync_time": dev.last_sync_time.isoformat()
        }
    }

@router.patch("/{device_id}/toggle-connection")
async def toggle_device_connection(
    device_id: int,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """Toggle device connection status (connected vs disconnected)."""
    pat_stmt = select(Patient).where(Patient.user_id == current_user.id)
    pat_res = await db.execute(pat_stmt)
    patient = pat_res.scalar_one_or_none()
    if not patient:
        raise HTTPException(status_code=400, detail="Patient profile not found.")
        
    stmt = select(Device).where(Device.id == device_id, Device.patient_id == patient.id)
    res = await db.execute(stmt)
    dev = res.scalar_one_or_none()
    if not dev:
        raise HTTPException(status_code=404, detail="Device not found.")
        
    dev.connection_status = "disconnected" if dev.connection_status == "connected" else "connected"
    await db.commit()
    return {"status": "success", "device_id": dev.id, "connection_status": dev.connection_status}

@router.delete("/{device_id}")
async def unpair_device(
    device_id: int,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """Unpair and remove device from patient account."""
    pat_stmt = select(Patient).where(Patient.user_id == current_user.id)
    pat_res = await db.execute(pat_stmt)
    patient = pat_res.scalar_one_or_none()
    if not patient:
        raise HTTPException(status_code=400, detail="Patient profile not found.")
        
    stmt = select(Device).where(Device.id == device_id, Device.patient_id == patient.id)
    res = await db.execute(stmt)
    dev = res.scalar_one_or_none()
    if not dev:
        raise HTTPException(status_code=404, detail="Device not found.")
        
    dev.is_active = False
    await db.commit()
    return {"status": "success", "message": f"{dev.device_name} successfully unpaired."}


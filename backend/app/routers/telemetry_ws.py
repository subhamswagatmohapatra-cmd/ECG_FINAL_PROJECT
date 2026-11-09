from fastapi import APIRouter, WebSocket, WebSocketDisconnect
import asyncio
import json
import math
import time
from datetime import datetime, timezone

router = APIRouter(tags=["telemetry-websocket"])

@router.websocket("/ws/telemetry")
async def websocket_telemetry_endpoint(websocket: WebSocket):
    await websocket.accept()
    
    # State for this telemetry session
    state = {
        "bpm": 74,
        "spo2": 98,
        "resp_rate": 16,
        "sys_bp": 120,
        "dia_bp": 80,
        "temp_c": 36.8,
        "rhythm": "normal",
        "is_paused": False,
        "is_simulated": True,
        "sample_index": 0
    }
    
    # Background task to send continuous telemetry stream
    async def stream_telemetry():
        try:
            while True:
                if not state["is_paused"]:
                    current_bpm = state["bpm"]
                    rhythm = state["rhythm"]
                    
                    # Physiological micro-fluctuations
                    t = time.time()
                    resp_phase = math.sin(t * (2 * math.pi * state["resp_rate"] / 60))
                    
                    # SpO2 variations with rhythm
                    if rhythm == "vtach":
                        spo2_val = 86 + math.sin(t) * 2
                        current_bpm = 165
                    elif rhythm == "bradycardia":
                        spo2_val = 96
                        current_bpm = 42
                    elif rhythm == "tachycardia":
                        spo2_val = 95
                        current_bpm = 138
                    elif rhythm == "afib":
                        spo2_val = 94
                        current_bpm = 118 + int(math.sin(t * 3) * 10)
                    else:
                        spo2_val = 98
                    
                    # Calculate MAP
                    map_val = round((2 * state["dia_bp"] + state["sys_bp"]) / 3)
                    
                    packet = {
                        "type": "vital_packet",
                        "timestamp": datetime.now(timezone.utc).isoformat(),
                        "bpm": current_bpm,
                        "spo2": round(spo2_val),
                        "resp_rate": state["resp_rate"],
                        "sys_bp": state["sys_bp"],
                        "dia_bp": state["dia_bp"],
                        "map": map_val,
                        "temp_c": state["temp_c"],
                        "rhythm": rhythm,
                        "is_simulated": True,
                        "status_label": "SIMULATED TELEMETRY (AAMI EC11)",
                        "disclaimer": "Simulated physiology for educational and testing demonstration only."
                    }
                    
                    await websocket.send_text(json.dumps(packet))
                
                await asyncio.sleep(0.5) # Send vitals update twice a second
        except asyncio.CancelledError:
            pass
        except Exception:
            pass

    sender_task = asyncio.create_task(stream_telemetry())
    
    try:
        while True:
            # Receive client control messages
            data = await websocket.receive_text()
            try:
                cmd = json.loads(data)
                cmd_type = cmd.get("type")
                
                if cmd_type == "set_bpm":
                    state["bpm"] = max(30, min(240, int(cmd.get("bpm", 74))))
                elif cmd_type == "set_rhythm":
                    state["rhythm"] = cmd.get("rhythm", "normal")
                elif cmd_type == "pause":
                    state["is_paused"] = True
                elif cmd_type == "resume":
                    state["is_paused"] = False
                elif cmd_type == "reset":
                    state["bpm"] = 74
                    state["rhythm"] = "normal"
                    state["is_paused"] = False
                elif cmd_type == "cycle_nibp":
                    state["sys_bp"] = round(116 + (math.sin(time.time()) * 8))
                    state["dia_bp"] = round(76 + (math.cos(time.time()) * 6))
                
                # Acknowledge control command
                await websocket.send_text(json.dumps({
                    "type": "ack",
                    "state": {
                        "bpm": state["bpm"],
                        "rhythm": state["rhythm"],
                        "is_paused": state["is_paused"]
                    }
                }))
            except json.JSONDecodeError:
                pass
    except WebSocketDisconnect:
        sender_task.cancel()
    except Exception:
        sender_task.cancel()


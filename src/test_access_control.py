import pytest
from enum import Enum
from typing import List, Optional
from pydantic import BaseModel

# ==============================================================================
# 1. 权限与实体定义 (Based on "RBAC for Hospital Management")
# ==============================================================================

class Role(Enum):
    PATIENT = "patient"
    CLINICIAN = "clinician"
    ADMIN = "admin"

class User(BaseModel):
    user_id: str
    role: Role
    clinic_id: str  # 用于多租户/机构隔离

class ChatRecord(BaseModel):
    record_id: str
    patient_id: str
    content: str
    clinic_id: str

# ==============================================================================
# 2. 模拟被测系统：医疗数据访问层 (DataAccessLayer)
# ==============================================================================

class PermissionError(Exception):
    """自定义异常：当违反访问控制策略时抛出"""
    pass

class MedicalDataVault:
    """
    模拟被测系统：负责执行临床数据访问策略
    Ref: "Stick to Least Privilege: Grant the minimum access necessary."
    """
    def __init__(self):
        # 模拟数据库
        self.chat_history = {
            "rec_001": ChatRecord(record_id="rec_001", patient_id="pat_A", content="Patient A history", clinic_id="clinic_1"),
            "rec_002": ChatRecord(record_id="rec_002", patient_id="pat_B", content="Patient B history", clinic_id="clinic_1"),
            "rec_003": ChatRecord(record_id="rec_003", patient_id="pat_C", content="Patient C history", clinic_id="clinic_2")
        }
        self.triage_queue = ["pat_A", "pat_B", "pat_C"]

    def fetch_chat_history(self, requester: User, target_patient_id: str) -> List[ChatRecord]:
        """
        策略 1：患者只能访问自己的记录
        策略 2：临床医生只能访问属于其所在诊所的患者记录
        """
        # 权限检查：如果是患者，且请求的不是自己的 ID
        if requester.role == Role.PATIENT and requester.user_id != target_patient_id:
            raise PermissionError("Cross-patient data access is strictly prohibited.")
        
        # 策略执行：过滤出目标患者的记录
        records = [r for r in self.chat_history.values() if r.patient_id == target_patient_id]
        
        # 租户隔离检查（Scope-based Check）
        for r in records:
            if requester.role == Role.CLINICIAN and requester.clinic_id != r.clinic_id:
                raise PermissionError("Clinician access restricted to assigned clinic scope.")
                
        return records

    def get_triage_queue(self, requester: User) -> List[str]:
        """
        策略 3：只有具备 CLINICIAN 或 ADMIN 角色的用户可以访问分诊队列
        """
        if requester.role == Role.PATIENT:
            raise PermissionError("Patients are unauthorized to view the clinician triage queue.")
        return self.triage_queue

# ==============================================================================
# 3. 自动化测试套件
# ==============================================================================

@pytest.fixture
def data_vault():
    return MedicalDataVault()

# --- 场景 1: 患者隐私测试 (Cross-Patient Privacy) ---

def test_patient_cannot_fetch_other_patient_history(data_vault):
    """
    Requirement: Patient A cannot fetch Patient B chat history.
    """
    patient_a = User(user_id="pat_A", role=Role.PATIENT, clinic_id="clinic_1")
    
    # 断言：当 A 请求 B 的数据时，必须抛出 PermissionError
    with pytest.raises(PermissionError, match="Cross-patient data access"):
        data_vault.fetch_chat_history(patient_a, target_patient_id="pat_B")

def test_patient_can_fetch_own_history(data_vault):
    """
    验证患者有权访问自己的数据。
    """
    patient_a = User(user_id="pat_A", role=Role.PATIENT, clinic_id="clinic_1")
    records = data_vault.fetch_chat_history(patient_a, target_patient_id="pat_A")
    assert len(records) > 0
    assert records[0].content == "Patient A history"

# --- 场景 2: 角色限制测试 (Role-Based Restriction) ---

def test_patient_cannot_fetch_triage_queue(data_vault):
    """
    Requirement: Patient cannot fetch clinician triage queue.
    """
    patient_a = User(user_id="pat_A", role=Role.PATIENT, clinic_id="clinic_1")
    
    with pytest.raises(PermissionError, match="unauthorized to view the clinician triage queue"):
        data_vault.get_triage_queue(patient_a)

# --- 场景 3: 机构范围限制测试 (Scope-Based Restriction) ---



def test_clinician_access_restricted_to_clinic_scope(data_vault):
    """
    Requirement: Clinician access restricted to clinic scope.
    模拟诊所 1 的医生尝试访问诊所 2 的患者数据。
    """
    # 医生 X 属于 Clinic 1
    clinician_x = User(user_id="doc_X", role=Role.CLINICIAN, clinic_id="clinic_1")
    
    # 患者 C 属于 Clinic 2
    with pytest.raises(PermissionError, match="restricted to assigned clinic scope"):
        data_vault.fetch_chat_history(clinician_x, target_patient_id="pat_C")

def test_clinician_can_access_same_clinic_patients(data_vault):
    """
    验证医生可以访问自己诊所内的患者。
    """
    clinician_x = User(user_id="doc_X", role=Role.CLINICIAN, clinic_id="clinic_1")
    records = data_vault.fetch_chat_history(clinician_x, target_patient_id="pat_A")
    assert len(records) > 0
    assert records[0].patient_id == "pat_A"

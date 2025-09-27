import { describe, it, expect, beforeEach } from "vitest";

const ERR_NOT_AUTHORIZED = 100;
const ERR_INVALID_PATIENT = 101;
const ERR_INVALID_PRESCRIPTION = 102;
const ERR_INVALID_EVENT_TIMESTAMP = 103;
const ERR_INVALID_ADHERENCE_SCORE = 104;
const ERR_NO_ACTIVE_PRESCRIPTION = 105;
const ERR_EVENT_ALREADY_RECORDED = 106;
const ERR_INVALID_MILESTONE = 107;
const ERR_INSUFFICIENT_STAKE = 108;
const ERR_INVALID_REWARD_AMOUNT = 109;
const ERR_INVALID_PENALTY_AMOUNT = 110;
const ERR_ORACLE_NOT_VERIFIED = 111;
const ERR_PRESCRIPTION_EXPIRED = 112;
const ERR_INVALID_DOSAGE = 113;
const ERR_INVALID_FREQUENCY = 114;
const ERR_MAX_EVENTS_EXCEEDED = 115;
const ERR_INVALID_STREAK = 116;
const ERR_INVALID_UPDATE = 117;
const ERR_PATIENT_NOT_REGISTERED = 118;
const ERR_INVALID_STATUS = 119;
const ERR_INVALID_CALCULATION = 120;

interface PatientAdherence {
  totalEvents: number;
  adherenceScore: number;
  lastEventTimestamp: number;
  currentStreak: number;
  bestStreak: number;
  status: boolean;
}

interface AdherenceEvent {
  timestamp: number;
  dosageTaken: number;
  verified: boolean;
}

interface Result<T> {
  ok: boolean;
  value: T;
}

class AdherenceTrackerMock {
  state: {
    nextEventId: number;
    maxEventsPerPatient: number;
    oracleContract: string | null;
    rewardsDistributor: string | null;
    stakingVault: string | null;
    prescriptionManager: string | null;
    patientRegistry: string | null;
    adherenceThreshold: number;
    penaltyRate: number;
    rewardMultiplier: number;
    patientAdherence: Map<string, PatientAdherence>;
    adherenceEvents: Map<string, AdherenceEvent>;
    dailyAdherence: Map<string, boolean>;
  } = {
    nextEventId: 0,
    maxEventsPerPatient: 1000,
    oracleContract: null,
    rewardsDistributor: null,
    stakingVault: null,
    prescriptionManager: null,
    patientRegistry: null,
    adherenceThreshold: 80,
    penaltyRate: 10,
    rewardMultiplier: 2,
    patientAdherence: new Map(),
    adherenceEvents: new Map(),
    dailyAdherence: new Map(),
  };
  blockHeight: number = 0;
  caller: string = "ST1PATIENT";
  oracle: string = "ST1ORACLE";
  rewards: Array<{ patient: string; amount: number }> = [];
  penalties: Array<{ patient: string; amount: number }> = [];

  constructor() {
    this.reset();
  }

  reset() {
    this.state = {
      nextEventId: 0,
      maxEventsPerPatient: 1000,
      oracleContract: null,
      rewardsDistributor: null,
      stakingVault: null,
      prescriptionManager: null,
      patientRegistry: null,
      adherenceThreshold: 80,
      penaltyRate: 10,
      rewardMultiplier: 2,
      patientAdherence: new Map(),
      adherenceEvents: new Map(),
      dailyAdherence: new Map(),
    };
    this.blockHeight = 0;
    this.caller = "ST1PATIENT";
    this.oracle = "ST1ORACLE";
    this.rewards = [];
    this.penalties = [];
  }

  setOracleContract(contract: string): Result<boolean> {
    this.state.oracleContract = contract;
    return { ok: true, value: true };
  }

  setRewardsDistributor(contract: string): Result<boolean> {
    this.state.rewardsDistributor = contract;
    return { ok: true, value: true };
  }

  setStakingVault(contract: string): Result<boolean> {
    this.state.stakingVault = contract;
    return { ok: true, value: true };
  }

  setPrescriptionManager(contract: string): Result<boolean> {
    this.state.prescriptionManager = contract;
    return { ok: true, value: true };
  }

  setPatientRegistry(contract: string): Result<boolean> {
    this.state.patientRegistry = contract;
    return { ok: true, value: true };
  }

  setAdherenceThreshold(newThreshold: number): Result<boolean> {
    if (newThreshold < 0 || newThreshold > 100) return { ok: false, value: ERR_INVALID_ADHERENCE_SCORE };
    this.state.adherenceThreshold = newThreshold;
    return { ok: true, value: true };
  }

  setPenaltyRate(newRate: number): Result<boolean> {
    if (newRate > 100) return { ok: false, value: ERR_INVALID_PENALTY_AMOUNT };
    this.state.penaltyRate = newRate;
    return { ok: true, value: true };
  }

  setRewardMultiplier(newMultiplier: number): Result<boolean> {
    if (newMultiplier <= 0) return { ok: false, value: ERR_INVALID_REWARD_AMOUNT };
    this.state.rewardMultiplier = newMultiplier;
    return { ok: true, value: true };
  }

  submitIntakeEvent(patient: string, timestamp: number, dosage: number): Result<number> {
    if (this.caller !== this.oracle) return { ok: false, value: ERR_ORACLE_NOT_VERIFIED };
    const patientData = this.state.patientAdherence.get(patient) || { totalEvents: 0, adherenceScore: 0, lastEventTimestamp: 0, currentStreak: 0, bestStreak: 0, status: true };
    if (patientData.totalEvents >= this.state.maxEventsPerPatient) return { ok: false, value: ERR_MAX_EVENTS_EXCEEDED };
    if (timestamp <= patientData.lastEventTimestamp || timestamp < this.blockHeight) return { ok: false, value: ERR_INVALID_EVENT_TIMESTAMP };
    const eventKey = `${patient}-${this.state.nextEventId}`;
    if (this.state.adherenceEvents.has(eventKey)) return { ok: false, value: ERR_EVENT_ALREADY_RECORDED };
    const day = Math.floor(timestamp / 86400);
    const dayKey = `${patient}-${day}`;
    this.state.dailyAdherence.set(dayKey, true);
    this.state.adherenceEvents.set(eventKey, { timestamp, dosageTaken: dosage, verified: true });
    const newStreak = patientData.currentStreak + 1;
    this.state.patientAdherence.set(patient, {
      ...patientData,
      totalEvents: patientData.totalEvents + 1,
      lastEventTimestamp: timestamp,
      currentStreak: newStreak,
      bestStreak: Math.max(newStreak, patientData.bestStreak),
    });
    const id = this.state.nextEventId;
    this.state.nextEventId++;
    return { ok: true, value: id };
  }

  calculateAdherenceScore(patient: string): Result<number> {
    const patientData = this.state.patientAdherence.get(patient);
    if (!patientData) return { ok: false, value: ERR_INVALID_PATIENT };
    const expected = 30;
    if (expected <= 0) return { ok: false, value: ERR_INVALID_CALCULATION };
    const score = Math.floor((patientData.totalEvents / expected) * 100);
    this.state.patientAdherence.set(patient, { ...patientData, adherenceScore: score });
    if (score >= this.state.adherenceThreshold) {
      const reward = score * this.state.rewardMultiplier;
      this.rewards.push({ patient, amount: reward });
    } else {
      const penalty = Math.floor(((100 - score) * this.state.penaltyRate) / 100);
      this.penalties.push({ patient, amount: penalty });
    }
    return { ok: true, value: score };
  }

  checkMilestone(patient: string, milestone: number): Result<number> {
    const patientData = this.state.patientAdherence.get(patient);
    if (!patientData) return { ok: false, value: ERR_INVALID_PATIENT };
    if (patientData.currentStreak >= milestone) {
      const reward = milestone * 10;
      this.rewards.push({ patient, amount: reward });
      return { ok: true, value: patientData.currentStreak };
    }
    return { ok: false, value: ERR_INVALID_MILESTONE };
  }

  resetPatientAdherence(patient: string): Result<boolean> {
    this.state.patientAdherence.delete(patient);
    return { ok: true, value: true };
  }

  getPatientAdherence(patient: string): PatientAdherence | null {
    return this.state.patientAdherence.get(patient) || null;
  }

  getAdherenceEvent(patient: string, eventId: number): AdherenceEvent | null {
    return this.state.adherenceEvents.get(`${patient}-${eventId}`) || null;
  }

  getDailyAdherence(patient: string, day: number): boolean | null {
    return this.state.dailyAdherence.get(`${patient}-${day}`) || null;
  }
}

describe("AdherenceTracker", () => {
  let contract: AdherenceTrackerMock;

  beforeEach(() => {
    contract = new AdherenceTrackerMock();
    contract.reset();
    contract.setOracleContract("ST1ORACLE");
    contract.setRewardsDistributor("ST1REWARDS");
    contract.setStakingVault("ST1VAULT");
    contract.setPrescriptionManager("ST1PRESC");
    contract.setPatientRegistry("ST1REG");
    contract.caller = "ST1ORACLE";
  });

  it("submits intake event successfully", () => {
    const result = contract.submitIntakeEvent("ST1PATIENT", 1000, 1);
    expect(result.ok).toBe(true);
    expect(result.value).toBe(0);
    const adherence = contract.getPatientAdherence("ST1PATIENT");
    expect(adherence?.totalEvents).toBe(1);
    expect(adherence?.lastEventTimestamp).toBe(1000);
    expect(adherence?.currentStreak).toBe(1);
    expect(adherence?.bestStreak).toBe(1);
    const event = contract.getAdherenceEvent("ST1PATIENT", 0);
    expect(event?.timestamp).toBe(1000);
    expect(event?.dosageTaken).toBe(1);
    expect(event?.verified).toBe(true);
    const daily = contract.getDailyAdherence("ST1PATIENT", 0);
    expect(daily).toBe(true);
  });

  it("rejects submit from non-oracle", () => {
    contract.caller = "ST1FAKE";
    const result = contract.submitIntakeEvent("ST1PATIENT", 1000, 1);
    expect(result.ok).toBe(false);
    expect(result.value).toBe(ERR_ORACLE_NOT_VERIFIED);
  });

  it("rejects invalid timestamp", () => {
    contract.submitIntakeEvent("ST1PATIENT", 1000, 1);
    const result = contract.submitIntakeEvent("ST1PATIENT", 999, 1);
    expect(result.ok).toBe(false);
    expect(result.value).toBe(ERR_INVALID_EVENT_TIMESTAMP);
  });

  it("calculates adherence score successfully", () => {
    contract.submitIntakeEvent("ST1PATIENT", 1000, 1);
    contract.submitIntakeEvent("ST1PATIENT", 2000, 1);
    contract.submitIntakeEvent("ST1PATIENT", 3000, 1);
    const result = contract.calculateAdherenceScore("ST1PATIENT");
    expect(result.ok).toBe(true);
    expect(result.value).toBe(10);
    const adherence = contract.getPatientAdherence("ST1PATIENT");
    expect(adherence?.adherenceScore).toBe(10);
    expect(contract.penalties).toEqual([{ patient: "ST1PATIENT", amount: 9 }]);
  });

  it("triggers reward on high score", () => {
    for (let i = 0; i < 25; i++) {
      contract.submitIntakeEvent("ST1PATIENT", 1000 + i * 100, 1);
    }
    const result = contract.calculateAdherenceScore("ST1PATIENT");
    expect(result.ok).toBe(true);
    expect(result.value).toBe(83);
    expect(contract.rewards).toEqual([{ patient: "ST1PATIENT", amount: 166 }]);
  });

  it("checks milestone successfully", () => {
    for (let i = 0; i < 5; i++) {
      contract.submitIntakeEvent("ST1PATIENT", 1000 + i * 100, 1);
    }
    const result = contract.checkMilestone("ST1PATIENT", 5);
    expect(result.ok).toBe(true);
    expect(result.value).toBe(5);
    expect(contract.rewards).toEqual([{ patient: "ST1PATIENT", amount: 50 }]);
  });

  it("rejects invalid milestone", () => {
    contract.submitIntakeEvent("ST1PATIENT", 1000, 1);
    const result = contract.checkMilestone("ST1PATIENT", 5);
    expect(result.ok).toBe(false);
    expect(result.value).toBe(ERR_INVALID_MILESTONE);
  });

  it("resets patient adherence", () => {
    contract.submitIntakeEvent("ST1PATIENT", 1000, 1);
    const result = contract.resetPatientAdherence("ST1PATIENT");
    expect(result.ok).toBe(true);
    expect(result.value).toBe(true);
    const adherence = contract.getPatientAdherence("ST1PATIENT");
    expect(adherence).toBe(null);
  });

  it("sets adherence threshold", () => {
    const result = contract.setAdherenceThreshold(90);
    expect(result.ok).toBe(true);
    expect(result.value).toBe(true);
    expect(contract.state.adherenceThreshold).toBe(90);
  });

  it("rejects invalid threshold", () => {
    const result = contract.setAdherenceThreshold(101);
    expect(result.ok).toBe(false);
    expect(result.value).toBe(ERR_INVALID_ADHERENCE_SCORE);
  });

  it("sets penalty rate", () => {
    const result = contract.setPenaltyRate(15);
    expect(result.ok).toBe(true);
    expect(result.value).toBe(true);
    expect(contract.state.penaltyRate).toBe(15);
  });

  it("rejects invalid penalty rate", () => {
    const result = contract.setPenaltyRate(101);
    expect(result.ok).toBe(false);
    expect(result.value).toBe(ERR_INVALID_PENALTY_AMOUNT);
  });

  it("sets reward multiplier", () => {
    const result = contract.setRewardMultiplier(3);
    expect(result.ok).toBe(true);
    expect(result.value).toBe(true);
    expect(contract.state.rewardMultiplier).toBe(3);
  });

  it("rejects invalid reward multiplier", () => {
    const result = contract.setRewardMultiplier(0);
    expect(result.ok).toBe(false);
    expect(result.value).toBe(ERR_INVALID_REWARD_AMOUNT);
  });

  it("rejects max events exceeded", () => {
    contract.state.maxEventsPerPatient = 1;
    contract.submitIntakeEvent("ST1PATIENT", 1000, 1);
    const result = contract.submitIntakeEvent("ST1PATIENT", 2000, 1);
    expect(result.ok).toBe(false);
    expect(result.value).toBe(ERR_MAX_EVENTS_EXCEEDED);
  });
});
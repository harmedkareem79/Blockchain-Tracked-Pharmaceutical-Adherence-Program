(define-constant ERR-NOT-AUTHORIZED u100)
(define-constant ERR-INVALID-PATIENT u101)
(define-constant ERR-INVALID-PRESCRIPTION u102)
(define-constant ERR-INVALID-EVENT-TIMESTAMP u103)
(define-constant ERR-INVALID-ADHERENCE-SCORE u104)
(define-constant ERR-NO-ACTIVE-PRESCRIPTION u105)
(define-constant ERR-EVENT-ALREADY-RECORDED u106)
(define-constant ERR-INVALID-MILESTONE u107)
(define-constant ERR-INSUFFICIENT-STAKE u108)
(define-constant ERR-INVALID-REWARD-AMOUNT u109)
(define-constant ERR-INVALID-PENALTY-AMOUNT u110)
(define-constant ERR-ORACLE-NOT-VERIFIED u111)
(define-constant ERR-PRESCRIPTION_EXPIRED u112)
(define-constant ERR-INVALID-DOSAGE u113)
(define-constant ERR-INVALID-FREQUENCY u114)
(define-constant ERR-MAX-EVENTS_EXCEEDED u115)
(define-constant ERR-INVALID-STREAK u116)
(define-constant ERR-INVALID-UPDATE u117)
(define-constant ERR-PATIENT-NOT-REGISTERED u118)
(define-constant ERR-INVALID-STATUS u119)
(define-constant ERR-INVALID-CALCULATION u120)

(define-data-var next-event-id uint u0)
(define-data-var max-events-per-patient uint u1000)
(define-data-var oracle-contract (optional principal) none)
(define-data-var rewards-distributor (optional principal) none)
(define-data-var staking-vault (optional principal) none)
(define-data-var prescription-manager (optional principal) none)
(define-data-var patient-registry (optional principal) none)
(define-data-var adherence-threshold uint u80)
(define-data-var penalty-rate uint u10)
(define-data-var reward-multiplier uint u2)

(define-map patient-adherence
  principal
  {
    total-events: uint,
    adherence-score: uint,
    last-event-timestamp: uint,
    current-streak: uint,
    best-streak: uint,
    status: bool
  }
)

(define-map adherence-events
  { patient: principal, event-id: uint }
  {
    timestamp: uint,
    dosage-taken: uint,
    verified: bool
  }
)

(define-map daily-adherence
  { patient: principal, day: uint }
  bool
)

(define-read-only (get-patient-adherence (patient principal))
  (map-get? patient-adherence patient)
)

(define-read-only (get-adherence-event (patient principal) (event-id uint))
  (map-get? adherence-events { patient: patient, event-id: event-id })
)

(define-read-only (get-daily-adherence (patient principal) (day uint))
  (map-get? daily-adherence { patient: patient, day: day })
)

(define-private (validate-patient (patient principal))
  (if (is-some (contract-call? (unwrap! (var-get patient-registry) (err ERR-NOT-AUTHORIZED)) get-patient patient))
      (ok true)
      (err ERR-PATIENT-NOT-REGISTERED))
)

(define-private (validate-oracle (caller principal))
  (if (is-eq caller (unwrap! (var-get oracle-contract) (err ERR-ORACLE-NOT-VERIFIED)))
      (ok true)
      (err ERR-ORACLE-NOT-VERIFIED))
)

(define-private (validate-timestamp (ts uint))
  (if (and (> ts (var-get last-event-timestamp (default-to { last-event-timestamp: u0 } (map-get? patient-adherence tx-sender)))) (>= ts block-height))
      (ok true)
      (err ERR-INVALID-EVENT-TIMESTAMP))
)

(define-private (validate-dosage (dosage uint) (patient principal))
  (let ((prescription (contract-call? (unwrap! (var-get prescription-manager) (err ERR-NOT-AUTHORIZED)) get-prescription patient)))
    (if (is-eq dosage (get dosage prescription))
        (ok true)
        (err ERR-INVALID-DOSAGE)))
)

(define-private (calculate-score (events uint) (expected uint))
  (if (> expected u0)
      (ok (/ (* events u100) expected))
      (err ERR-INVALID-CALCULATION))
)

(define-private (update-streak (patient principal) (adhered bool))
  (let ((current (get current-streak (default-to { current-streak: u0 } (map-get? patient-adherence patient))))
        (best (get best-streak (default-to { best-streak: u0 } (map-get? patient-adherence patient)))))
    (if adhered
        (let ((new-streak (+ current u1)))
          (map-set patient-adherence patient
            (merge (unwrap! (map-get? patient-adherence patient) (err ERR-INVALID-PATIENT))
              { current-streak: new-streak, best-streak: (if (> new-streak best) new-streak best) })))
        (map-set patient-adherence patient
          (merge (unwrap! (map-get? patient-adherence patient) (err ERR-INVALID-PATIENT))
            { current-streak: u0 })))
    (ok true))
)

(define-public (set-oracle-contract (contract principal))
  (begin
    (asserts! (is-eq tx-sender contract-caller) (err ERR-NOT-AUTHORIZED))
    (var-set oracle-contract (some contract))
    (ok true))
)

(define-public (set-rewards-distributor (contract principal))
  (begin
    (asserts! (is-eq tx-sender contract-caller) (err ERR-NOT-AUTHORIZED))
    (var-set rewards-distributor (some contract))
    (ok true))
)

(define-public (set-staking-vault (contract principal))
  (begin
    (asserts! (is-eq tx-sender contract-caller) (err ERR-NOT-AUTHORIZED))
    (var-set staking-vault (some contract))
    (ok true))
)

(define-public (set-prescription-manager (contract principal))
  (begin
    (asserts! (is-eq tx-sender contract-caller) (err ERR-NOT-AUTHORIZED))
    (var-set prescription-manager (some contract))
    (ok true))
)

(define-public (set-patient-registry (contract principal))
  (begin
    (asserts! (is-eq tx-sender contract-caller) (err ERR-NOT-AUTHORIZED))
    (var-set patient-registry (some contract))
    (ok true))
)

(define-public (set-adherence-threshold (new-threshold uint))
  (begin
    (asserts! (is-eq tx-sender contract-caller) (err ERR-NOT-AUTHORIZED))
    (asserts! (and (>= new-threshold u0) (<= new-threshold u100)) (err ERR-INVALID-ADHERENCE-SCORE))
    (var-set adherence-threshold new-threshold)
    (ok true))
)

(define-public (set-penalty-rate (new-rate uint))
  (begin
    (asserts! (is-eq tx-sender contract-caller) (err ERR-NOT-AUTHORIZED))
    (asserts! (<= new-rate u100) (err ERR-INVALID-PENALTY-AMOUNT))
    (var-set penalty-rate new-rate)
    (ok true))
)

(define-public (set-reward-multiplier (new-multiplier uint))
  (begin
    (asserts! (is-eq tx-sender contract-caller) (err ERR-NOT-AUTHORIZED))
    (asserts! (> new-multiplier u0) (err ERR-INVALID-REWARD-AMOUNT))
    (var-set reward-multiplier new-multiplier)
    (ok true))
)

(define-public (submit-intake-event (patient principal) (timestamp uint) (dosage uint))
  (begin
    (try! (validate-oracle tx-sender))
    (try! (validate-patient patient))
    (try! (validate-timestamp timestamp))
    (try! (validate-dosage dosage patient))
    (let ((event-id (var-get next-event-id))
          (patient-data (default-to { total-events: u0, adherence-score: u0, last-event-timestamp: u0, current-streak: u0, best-streak: u0, status: true } (map-get? patient-adherence patient)))
          (day (/ timestamp u86400)))
      (asserts! (< (get total-events patient-data) (var-get max-events-per-patient)) (err ERR-MAX-EVENTS_EXCEEDED))
      (asserts! (is-none (map-get? adherence-events { patient: patient, event-id: event-id })) (err ERR-EVENT-ALREADY-RECORDED))
      (map-set adherence-events { patient: patient, event-id: event-id }
        { timestamp: timestamp, dosage-taken: dosage, verified: true })
      (map-set daily-adherence { patient: patient, day: day } true)
      (map-set patient-adherence patient
        (merge patient-data { total-events: (+ (get total-events patient-data) u1), last-event-timestamp: timestamp }))
      (try! (update-streak patient true))
      (var-set next-event-id (+ event-id u1))
      (print { event: "intake-recorded", patient: patient, event-id: event-id })
      (ok event-id)))
)

(define-public (calculate-adherence-score (patient principal))
  (begin
    (try! (validate-patient patient))
    (let ((prescription (contract-call? (unwrap! (var-get prescription-manager) (err ERR-NOT-AUTHORIZED)) get-prescription patient))
          (events (get total-events (default-to { total-events: u0 } (map-get? patient-adherence patient))))
          (expected (get expected-intakes prescription)))
      (try! (calculate-score events expected))
      (let ((score (unwrap! (calculate-score events expected) (err ERR-INVALID-CALCULATION))))
        (map-set patient-adherence patient
          (merge (unwrap! (map-get? patient-adherence patient) (err ERR-INVALID-PATIENT))
            { adherence-score: score }))
        (if (>= score (var-get adherence-threshold))
            (try! (trigger-reward patient score))
            (try! (apply-penalty patient score)))
        (ok score))))
)

(define-private (trigger-reward (patient principal) (score uint))
  (let ((reward (* score (var-get reward-multiplier))))
    (contract-call? (unwrap! (var-get rewards-distributor) (err ERR-NOT-AUTHORIZED)) distribute-reward patient reward)))

(define-private (apply-penalty (patient principal) (score uint))
  (let ((penalty (/ (* (- u100 score) (var-get penalty-rate)) u100)))
    (contract-call? (unwrap! (var-get staking-vault) (err ERR-NOT-AUTHORIZED)) apply-penalty patient penalty)))

(define-public (check-milestone (patient principal) (milestone uint))
  (begin
    (try! (validate-patient patient))
    (let ((streak (get current-streak (default-to { current-streak: u0 } (map-get? patient-adherence patient)))))
      (if (>= streak milestone)
          (try! (trigger-reward patient (* milestone u10)))
          (err ERR-INVALID-MILESTONE))
      (ok streak)))
)

(define-public (reset-patient-adherence (patient principal))
  (begin
    (asserts! (is-eq tx-sender (unwrap! (var-get prescription-manager) (err ERR-NOT-AUTHORIZED))) (err ERR-NOT-AUTHORIZED))
    (map-delete patient-adherence patient)
    (ok true))
)
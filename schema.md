# Database Design

Database name: `patient_monitoring_system`

## Collections

### users
- _id
- name
- email
- password (hashed)
- role: patient / doctor / admin
- phone
- gender
- bloodGroup
- dateOfBirth
- emergencyContact

### healthrecords
- patient
- heartRate
- systolic
- diastolic
- spo2
- temperature
- bloodSugar
- weight
- status
- alertReasons
- recordedAt

### appointments
- patient
- doctor
- date
- reason
- status

### medications
- patient
- name
- dosage
- time
- frequency
- active

### messages
- sender
- receiver
- text
- read
- timestamps

### notifications
- user
- title
- message
- type
- read

### medicaldocuments
- patient
- title
- fileUrl
- fileType

## Relationship
User (Patient) 1 ---- N HealthRecord
User (Patient) 1 ---- N Appointment
User (Doctor) 1 ---- N Appointment
User (Patient) 1 ---- N Medication
User 1 ---- N Message (sender)
User 1 ---- N Message (receiver)
User 1 ---- N Notification
User (Patient) 1 ---- N MedicalDocument

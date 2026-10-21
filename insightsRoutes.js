import {Router} from 'express';
import HealthRecord from '../models/HealthRecord.js';
import {protect, roles} from '../middleware/auth.js';

const router = Router();

function num(v) {
  return typeof v === 'number' && Number.isFinite(v) ? v : null;
}

function average(rows, key) {
  const values = rows.map(r => num(r[key])).filter(v => v !== null);
  return values.length ? values.reduce((a,b) => a+b, 0) / values.length : null;
}

function trend(rows, key) {
  const values = rows.map(r => num(r[key])).filter(v => v !== null);
  if (values.length < 3) return 'insufficient_data';
  const recent = values.slice(0, Math.min(3, values.length));
  const older = values.slice(3, Math.min(6, values.length));
  if (!older.length) return 'stable';
  const r = recent.reduce((a,b)=>a+b,0)/recent.length;
  const o = older.reduce((a,b)=>a+b,0)/older.length;
  const delta = r-o;
  const tolerance = Math.max(Math.abs(o)*0.03, key === 'spo2' ? 0.5 : 1);
  if (delta > tolerance) return 'rising';
  if (delta < -tolerance) return 'falling';
  return 'stable';
}

function metricScore(value, low, high, criticalLow, criticalHigh) {
  if (value === null) return null;
  if (value < criticalLow || value > criticalHigh) return 0;
  if (value < low) return 65;
  if (value > high) return 65;
  return 100;
}

function buildInsights(rows) {
  if (!rows.length) {
    return {
      wellnessScore: null,
      level: 'no_data',
      summary: 'Add a few health readings to unlock personalized trend insights.',
      insights: [],
      trends: {},
      averages: {},
      disclaimer: 'Educational monitoring only — not a diagnosis or emergency service.'
    };
  }

  const latest = rows[0];
  const averages = {
    heartRate: average(rows, 'heartRate'),
    systolic: average(rows, 'systolic'),
    diastolic: average(rows, 'diastolic'),
    spo2: average(rows, 'spo2'),
    temperature: average(rows, 'temperature'),
    bloodSugar: average(rows, 'bloodSugar'),
    weight: average(rows, 'weight')
  };

  const trends = {
    heartRate: trend(rows, 'heartRate'),
    systolic: trend(rows, 'systolic'),
    diastolic: trend(rows, 'diastolic'),
    spo2: trend(rows, 'spo2'),
    temperature: trend(rows, 'temperature'),
    bloodSugar: trend(rows, 'bloodSugar'),
    weight: trend(rows, 'weight')
  };

  const scores = [
    metricScore(num(latest.heartRate), 60, 100, 40, 140),
    metricScore(num(latest.systolic), 90, 129, 70, 180),
    metricScore(num(latest.diastolic), 60, 79, 40, 120),
    metricScore(num(latest.spo2), 95, 100, 88, 100),
    metricScore(num(latest.temperature), 97, 99.5, 94, 104),
    metricScore(num(latest.bloodSugar), 70, 140, 50, 300)
  ].filter(v => v !== null);

  const wellnessScore = scores.length ? Math.round(scores.reduce((a,b)=>a+b,0)/scores.length) : null;
  const insights = [];

  if (latest.status === 'alert') {
    insights.push({
      priority: 'high',
      title: 'Recent reading needs attention',
      detail: (latest.alertReasons || []).join('. ') || 'One or more monitored values are outside the configured range.'
    });
  }
  if (trends.spo2 === 'falling') insights.push({
    priority: 'high', title: 'SpO₂ trend is falling',
    detail: 'Recent oxygen-saturation readings are lower than earlier readings. Recheck the measurement and follow your clinician’s advice.'
  });
  if (trends.heartRate === 'rising') insights.push({
    priority: 'medium', title: 'Heart-rate trend is rising',
    detail: 'Recent heart-rate readings are higher than the earlier readings in this window.'
  });
  if (trends.systolic === 'rising' || trends.diastolic === 'rising') insights.push({
    priority: 'medium', title: 'Blood-pressure trend is rising',
    detail: 'Recent blood-pressure readings are trending upward. Consistent measurements are more useful than a single reading.'
  });
  if (trends.weight === 'rising' || trends.weight === 'falling') insights.push({
    priority: 'low', title: 'Weight trend changed',
    detail: 'Your recent weight readings show a directional change. Track consistently if weight monitoring is part of your care plan.'
  });
  if (!insights.length) insights.push({
    priority: 'low', title: 'Your recent readings look steady',
    detail: 'No major directional changes were detected in the available monitoring data.'
  });

  let level = 'good';
  if (wellnessScore !== null && wellnessScore < 70) level = 'attention';
  if (wellnessScore !== null && wellnessScore < 45) level = 'high_attention';

  const riskReasons = [];
  if (trends.systolic === 'rising' && averages.systolic !== null && averages.systolic >= 130) riskReasons.push('systolic blood pressure is trending upward');
  if (trends.diastolic === 'rising' && averages.diastolic !== null && averages.diastolic >= 80) riskReasons.push('diastolic blood pressure is trending upward');
  if (trends.bloodSugar === 'rising' && averages.bloodSugar !== null && averages.bloodSugar >= 140) riskReasons.push('blood sugar is trending upward');
  if (trends.spo2 === 'falling' && averages.spo2 !== null && averages.spo2 < 96) riskReasons.push('SpO₂ is trending downward');
  if (trends.heartRate === 'rising' && averages.heartRate !== null && averages.heartRate > 100) riskReasons.push('heart rate is trending upward');
  if (latest.status === 'alert') riskReasons.push('the latest reading contains an alert');

  const riskLevel = riskReasons.length >= 2 ? 'high' : riskReasons.length === 1 ? 'moderate' : 'low';
  const sevenDayRisk = {
    level: riskLevel,
    label: riskLevel === 'high' ? 'Higher monitoring risk' : riskLevel === 'moderate' ? 'Moderate monitoring risk' : 'Lower monitoring risk',
    statement: riskReasons.length
      ? `Pattern-based estimate: the next 7 days may need closer monitoring because ${riskReasons.join(', ')}.`
      : 'Pattern-based estimate: no strong worsening trend was detected for the next 7 days from the available readings.',
    reasons: riskReasons,
    method: 'Uses recent direction and configured monitoring ranges; it is not a medical diagnosis or a clinically validated prediction model.'
  };

  return {
    wellnessScore,
    level,
    summary: level === 'good'
      ? 'Your recent monitoring data is relatively stable.'
      : 'Some recent measurements deserve closer monitoring.',
    insights: insights.slice(0, 5),
    trends,
    averages,
    latest: {
      recordedAt: latest.recordedAt,
      heartRate: latest.heartRate,
      systolic: latest.systolic,
      diastolic: latest.diastolic,
      spo2: latest.spo2,
      temperature: latest.temperature,
      bloodSugar: latest.bloodSugar,
      weight: latest.weight,
      status: latest.status
    },
    sampleSize: rows.length,
    sevenDayRisk,
    disclaimer: 'Educational monitoring only — not a diagnosis or emergency service.'
  };
}

router.get('/', protect, async (req, res) => {
  if (req.user.role !== 'patient') return res.status(403).json({message:'Patient insights are only available from a patient account.'});
  const rows = await HealthRecord.find({patient:req.user._id}).sort({recordedAt:-1}).limit(30);
  res.json(buildInsights(rows));
});

router.get('/patient/:patientId', protect, roles('doctor','admin'), async (req,res) => {
  const rows = await HealthRecord.find({patient:req.params.patientId}).sort({recordedAt:-1}).limit(30);
  res.json(buildInsights(rows));
});

export default router;

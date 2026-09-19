import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/auth-context';
import { getBookings, getNotifications, saveBooking, saveFeedback, sendNotification } from '../services/firebase';
import { caregivers, getRemainingBlockTime } from '../data/caregivers';
import { patients } from '../data/patients';
import { getFamilyCarePlans, saveCarePlan as persistCarePlan } from '../data/carePlans';
import { getEscrowLedger, releaseEscrowPayment, createEscrowHold } from '../services/paymentService';
import { getSubscriptions, toggleSubscriptionStatus, toggleAutoRenew } from '../engine/subscriptionEngine';
import { getCareJournals } from '../services/careJournalService';
import FeedbackModal from '../components/FeedbackModal';
import CarePlanModal from '../components/CarePlanModal';
import LiveSessionTracker from '../components/LiveSessionTracker';
import CareJournalModal from '../components/CareJournalModal';
import AiCareSummaryCard from '../components/AiCareSummaryCard';
import ReplacementModal from '../components/ReplacementModal';
import RouteOptimizerView from '../components/RouteOptimizerView';
import ScoreGauge from '../components/ScoreGauge';
import {
  Calendar, Clock, Star, Search, RefreshCw, Lock, BadgeCheck, Shield,
  AlertTriangle, User, Briefcase, IndianRupee, MapPin, Bell, CheckCircle,
  Heart, TrendingUp, Award, FileText, Ticket, QrCode, ShieldCheck, X,
  Phone, Send, Check, DollarSign, UploadCloud, ChevronRight, Activity,
  Sparkles, ExternalLink, ArrowRight, UserCheck, ShieldAlert, Zap, Plus,
  Layers, Stethoscope, Repeat, Navigation, Play, Pause
} from 'lucide-react';


const INITIAL_CARE_FINDER_BOOKINGS = [
  {
    id: 'BK-101',
    caregiverId: 1,
    caregiverName: 'Priya Sharma',
    domain: 'child',
    status: 'confirmed',
    shiftDate: 'Today, 03:00 PM — 07:00 PM',
    rate: 1800,
    address: 'Banjara Hills, Road No. 12',
    notes: 'ADHD support & after-school activities for 7yo daughter.',
    createdAt: new Date(Date.now() - 2 * 3600 * 1000).toISOString()
  },
  {
    id: 'BK-102',
    caregiverId: 5,
    caregiverName: 'Suresh Babu',
    domain: 'human',
    status: 'completed',
    shiftDate: 'Yesterday, 10:00 AM — 02:00 PM',
    rate: 2400,
    address: 'Madhapur, Near Mindspace',
    notes: 'Post-surgery physiotherapy assistance & vitals check.',
    createdAt: new Date(Date.now() - 28 * 3600 * 1000).toISOString()
  },
  {
    id: 'BK-103',
    caregiverId: 9,
    caregiverName: 'Kavitha Reddy',
    domain: 'pet',
    status: 'completed',
    shiftDate: '3 days ago, 08:00 AM — 12:00 PM',
    rate: 1400,
    address: 'Gachibowli, Financial District',
    notes: 'German Shepherd behavioral training and nutrition walk.',
    createdAt: new Date(Date.now() - 72 * 3600 * 1000).toISOString()
  },
];

const INITIAL_INCOMING_REQUESTS = [
  {
    id: 'REQ-501',
    patientName: 'Ananya Reddy',
    patientId: 'CF-20001',
    category: 'child',
    careNeeds: 'ADHD support for 7yo daughter during evening study hours.',
    location: 'Banjara Hills, Hyderabad',
    timeSlot: 'Today, 4:00 PM — 8:00 PM (4 Hrs)',
    payout: 1800,
    emergencyPhone: '+91 98765 43210',
  },
  {
    id: 'REQ-502',
    patientName: 'Deepak Menon',
    patientId: 'CF-20002',
    category: 'child',
    careNeeds: 'Infant night-shift support and soothing routine.',
    location: 'Ameerpet, Hyderabad',
    timeSlot: 'Tomorrow, 9:00 PM — 5:00 AM (8 Hrs)',
    payout: 3600,
    emergencyPhone: '+91 98765 43211',
  },
];

const INITIAL_CAREGIVER_ACTIVE_JOB = {
  id: 'JOB-901',
  patientName: 'Rajesh Kumar',
  patientId: 'CF-20003',
  category: 'human',
  careNeeds: 'Post-surgery mobility support & medication management for father (72).',
  location: 'Madhapur, Hyderabad',
  timeSlot: 'Active Now • Ends in 2h 45m',
  payout: 2400,
  emergencyPhone: '+91 98765 43212',
  startedAt: new Date(Date.now() - 75 * 60 * 1000).toISOString(),
  blockExpiresAt: new Date(Date.now() + 165 * 60 * 1000).toISOString(),
};

export default function DashboardPage() {
  const navigate = useNavigate();
  const { userProfile, role: authRole, switchRole } = useAuth();

  // Active view role (allows toggling preview directly from dashboard)
  const [activeTabRole, setActiveTabRole] = useState(() => {
    return authRole === 'caregiver' ? 'caregiver' : 'patient';
  });

  useEffect(() => {
    if (authRole) {
      setActiveTabRole(authRole === 'caregiver' ? 'caregiver' : 'patient');
    }
  }, [authRole]);

  // ── Care Finder State ──
  const [cfBookings, setCfBookings] = useState(() => {
    try {
      const saved = JSON.parse(localStorage.getItem('cm_cf_bookings'));
      return saved && saved.length > 0 ? saved : INITIAL_CARE_FINDER_BOOKINGS;
    } catch {
      return INITIAL_CARE_FINDER_BOOKINGS;
    }
  });
  const [bookingFilter, setBookingFilter] = useState('all'); // 'all', 'confirmed', 'completed', 'cancelled'
  const [feedbackFor, setFeedbackFor] = useState(null);
  const [safetyPassBooking, setSafetyPassBooking] = useState(null);
  const [rebookModalCaregiver, setRebookModalCaregiver] = useState(null);
  const [rebookDate, setRebookDate] = useState(() => new Date(Date.now() + 86400000).toISOString().split('T')[0]);
  const [rebookTime, setRebookTime] = useState('10:00');
  const [rebookDuration, setRebookDuration] = useState(4);
  const [rebookSuccessMsg, setRebookSuccessMsg] = useState('');

  // Rated bookings
  const [ratedBookings, setRatedBookings] = useState(() => {
    try { return JSON.parse(localStorage.getItem('cm_rated_bookings') || '[]'); }
    catch { return ['BK-103']; }
  });

  const markAsRated = (bookingId) => {
    const updated = [...ratedBookings, bookingId];
    setRatedBookings(updated);
    localStorage.setItem('cm_rated_bookings', JSON.stringify(updated));
  };
  const isRated = (bookingId) => ratedBookings.includes(bookingId);

  // Family Safety Profile
  const [safetyProfile, setSafetyProfile] = useState(() => {
    try {
      const stored = JSON.parse(localStorage.getItem('cm_safety_profile'));
      if (stored && Object.keys(stored).length > 0) return stored;
      return {
        emergencyContact: 'Rajesh Reddy (Spouse)',
        emergencyPhone: '+91 98480 22338',
        bloodGroup: 'B+ Positive',
        allergies: 'Penicillin, Dust Mites',
        healthConditions: 'Asthma (Mild), Hypertensive',
        medications: 'Inhaler as needed, Daily Multi-vitamins',
        notes: 'Child responds best to visual schedules and calm routines.'
      };
    } catch {
      return {};
    }
  });
  const [editingSafety, setEditingSafety] = useState(false);
  const saveSafetyProfile = (profile) => {
    setSafetyProfile(profile);
    localStorage.setItem('cm_safety_profile', JSON.stringify(profile));
    setEditingSafety(false);
  };

  // ── Multi-Member Structured Care Plans ──
  const [carePlans, setCarePlans] = useState(() => getFamilyCarePlans());
  const [editingPlan, setEditingPlan] = useState(null);
  const [isPlanModalOpen, setIsPlanModalOpen] = useState(false);

  const handleSaveCarePlan = (savedPlan) => {
    const updated = persistCarePlan(savedPlan);
    setCarePlans(updated);
    setIsPlanModalOpen(false);
    setEditingPlan(null);
    setNotifications(prev => [
      { id: Date.now(), title: '📋 Care Plan Saved', body: `Care plan for ${savedPlan.personName} synchronized across AI matching engine.`, time: 'Just now', type: 'trust' },
      ...prev
    ]);
  };

  // ── Subscriptions & Recurring Care State ──
  const [subscriptions, setSubscriptions] = useState(() => getSubscriptions());
  const handleToggleSub = (subId, currentStatus) => {
    const nextStatus = currentStatus === 'active' ? 'paused' : 'active';
    const updated = toggleSubscriptionStatus(subId, nextStatus);
    setSubscriptions(updated);
    setNotifications(prev => [
      { id: Date.now(), title: `🔄 Subscription ${nextStatus.toUpperCase()}`, body: `Recurring care plan #${subId} has been ${nextStatus}.`, time: 'Just now', type: 'job' },
      ...prev
    ]);
  };
  const handleToggleRenew = (subId) => {
    const updated = toggleAutoRenew(subId);
    setSubscriptions(updated);
  };

  // ── Digital Care Journals & AI Summary Modal State ──
  const [careJournals, setCareJournals] = useState(() => getCareJournals());
  const [journalModalOpen, setJournalModalOpen] = useState(false);
  const [journalForBooking, setJournalForBooking] = useState(null);

  // ── AI Replacement Engine State ──
  const [replacementModalOpen, setReplacementModalOpen] = useState(false);
  const [replacementCaregiver, setReplacementCaregiver] = useState({ id: 1, name: 'Priya Sharma' });
  const [replacementBooking, setReplacementBooking] = useState(null);

  // ── Caregiver State ──
  const [caregiverStatus, setCaregiverStatus] = useState(() => localStorage.getItem('cm_cg_status') || 'duty');
  const [incomingRequests, setIncomingRequests] = useState(() => {
    try {
      const saved = JSON.parse(localStorage.getItem('cm_incoming_requests'));
      return saved !== null ? saved : INITIAL_INCOMING_REQUESTS;
    } catch {
      return INITIAL_INCOMING_REQUESTS;
    }
  });
  const [activeJob, setActiveJob] = useState(() => {
    try {
      const saved = JSON.parse(localStorage.getItem('cm_cg_active_job'));
      return saved !== undefined ? saved : INITIAL_CAREGIVER_ACTIVE_JOB;
    } catch {
      return INITIAL_CAREGIVER_ACTIVE_JOB;
    }
  });
  const [caregiverEarnings, setCaregiverEarnings] = useState(() => {
    return parseInt(localStorage.getItem('cm_cg_earnings') || '28400', 10);
  });
  const [totalJobsCount, setTotalJobsCount] = useState(() => {
    return parseInt(localStorage.getItem('cm_cg_jobs_count') || '14', 10);
  });
  const [completedJobs, setCompletedJobs] = useState([
    {
      id: 'CJ-881',
      patientName: 'Ananya Reddy',
      patientId: 'CF-20001',
      date: 'Yesterday, May 17',
      hours: '4 hrs',
      payout: 1800,
      rating: 5.0,
      feedback: 'Priya was exceptionally patient and attentive. Highly recommend!',
      category: 'child'
    },
    {
      id: 'CJ-880',
      patientName: 'Deepak Menon',
      patientId: 'CF-20002',
      date: 'May 15, 2026',
      hours: '8 hrs (Night)',
      payout: 3600,
      rating: 4.9,
      feedback: 'Wonderful night care for our newborn. We were able to rest peacefully.',
      category: 'child'
    },
    {
      id: 'CJ-879',
      patientName: 'Padma Srinivas',
      patientId: 'CF-20004',
      date: 'May 12, 2026',
      hours: '5 hrs',
      payout: 2500,
      rating: 5.0,
      feedback: 'Excellent dementia care routines and compassionate handling.',
      category: 'human'
    }
  ]);

  const [payoutModalOpen, setPayoutModalOpen] = useState(false);
  const [payoutSuccessMsg, setPayoutSuccessMsg] = useState('');
  const [idCardOpen, setIdCardOpen] = useState(false);
  const [certModalOpen, setCertModalOpen] = useState(false);
  const [certSuccessMsg, setCertSuccessMsg] = useState('');
  const [notifications, setNotifications] = useState([
    { id: 1, title: '⚡ New High-Match Job Request', body: 'Ananya Reddy in Banjara Hills requested Child Care (98% Compatibility).', time: '10 mins ago', type: 'job' },
    { id: 2, title: '✅ Session Payment Credited', body: '₹2,400 successfully credited for Session #BK-102.', time: '2 hours ago', type: 'payout' },
    { id: 3, title: '⭐ 5-Star Review Received', body: '"Priya was exceptionally patient and attentive." +0.8 Trust Boost.', time: '1 day ago', type: 'trust' },
  ]);

  // ── Sync with live dynamic bookings & notifications ──
  useEffect(() => {
    async function syncDynamicData() {
      try {
        const storedBookings = await getBookings();
        if (storedBookings && storedBookings.length > 0) {
          const formatted = storedBookings.map((b) => ({
            id: b.id.startsWith('BK-') ? b.id : `BK-${b.id.slice(-4)}`,
            caregiverId: b.caregiverId,
            caregiverName: b.caregiverName,
            domain: b.domain || 'child',
            status: b.status || 'confirmed',
            shiftDate: b.scheduledDate ? `${b.scheduledDate}, ${b.scheduledTime || '10:00 AM'}` : 'Today, Immediate Shift',
            rate: b.totalAmount || b.rate || 1800,
            address: b.address || 'Banjara Hills, Road No. 12',
            notes: b.careNotes || 'Standard care session with verified supervision.',
            createdAt: b.createdAt || new Date().toISOString(),
          }));

          setCfBookings((prev) => {
            const map = new Map();
            formatted.forEach((item) => map.set(item.id, item));
            prev.forEach((item) => {
              if (!map.has(item.id)) map.set(item.id, item);
            });
            const merged = Array.from(map.values());
            localStorage.setItem('cm_cf_bookings', JSON.stringify(merged));
            return merged;
          });

          // Also populate incoming requests for caregiver
          const dynamicReqs = storedBookings
            .filter((b) => (b.caregiverId === 1 || b.caregiverUniqueId === 'CG-10001') && b.status === 'confirmed')
            .map((b) => ({
              id: `REQ-${b.id.slice(-4)}`,
              patientName: b.patientName || 'Ananya Reddy',
              patientId: b.patientUniqueId || 'CF-20001',
              category: b.domain || 'child',
              careNeeds: b.careNotes || 'Verified care session requested via AI CareMatch.',
              location: 'Banjara Hills, Hyderabad',
              timeSlot: b.scheduledDate ? `${b.scheduledDate} at ${b.scheduledTime || '10:00 AM'}` : 'Today, Immediate Shift',
              payout: b.totalAmount || 1800,
              emergencyPhone: '+91 98480 22338',
            }));

          if (dynamicReqs.length > 0) {
            setIncomingRequests((prev) => {
              const reqMap = new Map();
              dynamicReqs.forEach((r) => reqMap.set(r.id, r));
              prev.forEach((r) => {
                if (!reqMap.has(r.id)) reqMap.set(r.id, r);
              });
              const mergedReqs = Array.from(reqMap.values());
              localStorage.setItem('cm_incoming_requests', JSON.stringify(mergedReqs));
              return mergedReqs;
            });
          }
        }

        const storedNotifs = await getNotifications();
        if (storedNotifs && storedNotifs.length > 0) {
          const formattedNotifs = storedNotifs.map((n, idx) => ({
            id: n.id || `notif-${idx}-${Date.now()}`,
            title: n.title,
            body: n.body,
            time: 'Recently',
            type: n.type || 'job',
          }));

          setNotifications((prev) => {
            const notifMap = new Map();
            formattedNotifs.forEach((item) => notifMap.set(item.title, item));
            prev.forEach((item) => {
              if (!notifMap.has(item.title)) notifMap.set(item.title, item);
            });
            return Array.from(notifMap.values());
          });
        }
      } catch (err) {
        console.warn('Failed to sync live dashboard data:', err);
      }
    }
    syncDynamicData();
  }, []);

  // Update Caregiver Duty Status
  const updateCaregiverStatus = (status) => {
    setCaregiverStatus(status);
    localStorage.setItem('cm_cg_status', status);
  };

  // Caregiver Accepts Job
  const handleAcceptJob = (req) => {
    const newActive = {
      id: `JOB-${Date.now().toString().slice(-4)}`,
      patientName: req.patientName,
      patientId: req.patientId,
      category: req.category,
      careNeeds: req.careNeeds,
      location: req.location,
      timeSlot: 'Active Now • 4-Hour Dedicated Lock Active',
      payout: req.payout,
      emergencyPhone: req.emergencyPhone,
      startedAt: new Date().toISOString(),
      blockExpiresAt: new Date(Date.now() + 4 * 3600 * 1000).toISOString(),
    };
    setActiveJob(newActive);
    localStorage.setItem('cm_cg_active_job', JSON.stringify(newActive));

    const updatedReqs = incomingRequests.filter(r => r.id !== req.id);
    setIncomingRequests(updatedReqs);
    localStorage.setItem('cm_incoming_requests', JSON.stringify(updatedReqs));

    updateCaregiverStatus('duty');
    setNotifications(prev => [
      { id: Date.now(), title: `🔒 Job Accepted — 4-Hour Focus Locked`, body: `You are now dedicated to ${req.patientName}. All other requests paused.`, time: 'Just now', type: 'job' },
      ...prev
    ]);
  };

  // Caregiver Declines Job
  const handleDeclineJob = (reqId) => {
    const updatedReqs = incomingRequests.filter(r => r.id !== reqId);
    setIncomingRequests(updatedReqs);
    localStorage.setItem('cm_incoming_requests', JSON.stringify(updatedReqs));
  };

  // Caregiver Completes Active Shift
  const handleCompleteActiveJob = () => {
    if (!activeJob) return;
    const completedEntry = {
      id: `CJ-${Date.now().toString().slice(-3)}`,
      patientName: activeJob.patientName,
      patientId: activeJob.patientId,
      date: 'Today (Just completed)',
      hours: '4 hrs',
      payout: activeJob.payout,
      rating: 5.0,
      feedback: 'Job completed smoothly. Pending client review submission.',
      category: activeJob.category,
    };
    setCompletedJobs([completedEntry, ...completedJobs]);
    const newEarnings = caregiverEarnings + activeJob.payout;
    setCaregiverEarnings(newEarnings);
    localStorage.setItem('cm_cg_earnings', newEarnings.toString());

    const newJobsCount = totalJobsCount + 1;
    setTotalJobsCount(newJobsCount);
    localStorage.setItem('cm_cg_jobs_count', newJobsCount.toString());

    setActiveJob(null);
    localStorage.removeItem('cm_cg_active_job');
    updateCaregiverStatus('available');

    setNotifications(prev => [
      { id: Date.now(), title: `💰 ₹${activeJob.payout} Added to Earnings`, body: `Session completed for ${activeJob.patientName}. You are now Available for new matches.`, time: 'Just now', type: 'payout' },
      ...prev
    ]);
  };

  // Care Finder: Patient Completes Session & triggers Rating
  const handleCompleteSessionByPatient = (booking) => {
    const updated = cfBookings.map((b) => b.id === booking.id ? { ...b, status: 'completed' } : b);
    setCfBookings(updated);
    localStorage.setItem('cm_cf_bookings', JSON.stringify(updated));
    const cg = getCg(booking.caregiverId) || { id: booking.caregiverId, name: booking.caregiverName };
    setFeedbackFor({ ...cg, bookingId: booking.id });
  };

  // Care Finder: Cancel Booking
  const handleCancelBooking = (bookingId) => {
    const updated = cfBookings.map((b) => b.id === bookingId ? { ...b, status: 'cancelled' } : b);
    setCfBookings(updated);
    localStorage.setItem('cm_cf_bookings', JSON.stringify(updated));
    setNotifications(prev => [
      { id: Date.now(), title: '❌ Booking Cancelled', body: `Booking #${bookingId} was successfully cancelled. Full refund initiated.`, time: 'Just now', type: 'job' },
      ...prev
    ]);
  };

  // Quick Re-booking Confirmation
  const handleConfirmRebook = async () => {
    if (!rebookModalCaregiver) return;
    const cg = rebookModalCaregiver;
    const newBooking = {
      caregiverId: cg.id,
      caregiverName: cg.name,
      caregiverUniqueId: cg.uniqueId || `CG-${cg.id}`,
      patientName: userName,
      patientUniqueId: userUniqueId,
      domain: cg.domain || cg.category,
      urgency: 'scheduled',
      scheduledDate: rebookDate,
      scheduledTime: rebookTime,
      durationHours: rebookDuration,
      totalAmount: cg.pricing * rebookDuration,
      careNotes: 'Re-booked session via Family Dashboard.',
      status: 'confirmed',
      createdAt: new Date().toISOString(),
    };

    const saved = await saveBooking(newBooking);

    const formattedItem = {
      id: saved.id.startsWith('BK-') ? saved.id : `BK-${saved.id.slice(-4)}`,
      caregiverId: cg.id,
      caregiverName: cg.name,
      domain: cg.domain || cg.category,
      status: 'confirmed',
      shiftDate: `${rebookDate}, ${rebookTime}`,
      rate: cg.pricing * rebookDuration,
      address: `${cg.location?.name || 'Banjara Hills'}, Hyderabad`,
      notes: 'Re-booked session via Family Dashboard.',
      createdAt: new Date().toISOString(),
    };

    setCfBookings((prev) => {
      const updated = [formattedItem, ...prev];
      localStorage.setItem('cm_cf_bookings', JSON.stringify(updated));
      return updated;
    });

    await sendNotification({
      type: 'booking',
      targetRole: 'caregiver',
      targetId: cg.uniqueId || `CG-${cg.id}`,
      title: `📅 Re-Booking Confirmed from ${userName}`,
      body: `Shift booked for ${rebookDate} at ${rebookTime} (${rebookDuration} hours). Payout: ₹${cg.pricing * rebookDuration}.`,
    });

    setRebookSuccessMsg('✅ Caregiver Re-Booked successfully! Check your active sessions.');
    setTimeout(() => {
      setRebookModalCaregiver(null);
      setRebookSuccessMsg('');
    }, 2000);
  };

  // Request Instant Payout
  const handleRequestPayout = () => {
    setPayoutSuccessMsg('Transfer Initiated! ₹12,600 is being transferred to UPI: priya.sharma@okaxis. Expected within 5 minutes.');
    setTimeout(() => {
      setPayoutModalOpen(false);
      setPayoutSuccessMsg('');
    }, 3500);
  };

  // Upload Certificate
  const handleUploadCertificate = () => {
    setCertSuccessMsg('✅ First Aid Certificate uploaded & verified via AI OCR! Trust Score increased to 94/100 (+2 pts).');
    setTimeout(() => {
      setCertModalOpen(false);
      setCertSuccessMsg('');
    }, 3000);
  };

  // Submit Feedback from Care Finder
  const handleFeedbackSubmit = ({ caregiverId, ratings, comment }) => {
    saveFeedback({ caregiverId, ratings, comment });
    if (feedbackFor?.bookingId) {
      markAsRated(feedbackFor.bookingId);
    }
    setNotifications(prev => [
      { id: Date.now(), title: '⭐ Review Submitted', body: `Thank you for reviewing your caregiver. Feedback recorded to trust score.`, time: 'Just now', type: 'trust' },
      ...prev
    ]);
  };

  // Helpers
  const getCg = (id) => caregivers.find(c => c.id === id);
  const favourites = (() => {
    try { return JSON.parse(localStorage.getItem('cm_favourites') || '[]'); }
    catch { return [1, 5]; }
  })();
  const favCaregivers = caregivers.filter(c => favourites.includes(c.id));

  const userName = userProfile?.displayName?.replace(/\s*\([^)]*\)/g, '').trim() ||
    (activeTabRole === 'caregiver' ? 'Priya Sharma' : 'Vaishnavi Reddy');
  const userUniqueId = userProfile?.uniqueId || (activeTabRole === 'caregiver' ? 'CG-10001' : 'CF-20001');

  // Filtered Bookings for Care Finder
  const filteredBookings = cfBookings.filter(b => {
    if (bookingFilter === 'all') return true;
    return b.status === bookingFilter;
  });

  const activeCount = cfBookings.filter(b => b.status === 'confirmed').length;
  const completedCount = cfBookings.filter(b => b.status === 'completed').length;


  return (
    <div className={`dashboard-page ${activeTabRole}-mode`}>
      <div className="container">

        {/* ── TOP ROLE SELECTOR & DEMO TOGGLE BAR ── */}
        <div className="dashboard-control-bar glass-card">
          <div className="control-left">
            <span className="control-label">CURRENT PORTAL VIEW:</span>
            <div className="role-switch-pills">
              <button
                type="button"
                className={`role-pill ${activeTabRole === 'patient' ? 'active cf-active' : ''}`}
                onClick={() => {
                  setActiveTabRole('patient');
                  switchRole('patient');
                }}
              >
                <User size={15} />
                <span>🩺 Care Finder / Family Portal</span>
              </button>
              <button
                type="button"
                className={`role-pill ${activeTabRole === 'caregiver' ? 'active cg-active' : ''}`}
                onClick={() => {
                  setActiveTabRole('caregiver');
                  switchRole('caregiver');
                }}
              >
                <Briefcase size={15} />
                <span>💼 Caregiver Professional Hub</span>
              </button>
            </div>
          </div>
          <div className="control-right">
            <span className="live-pill">
              <span className="pulse-beacon" />
              Live Sync: Active
            </span>
          </div>
        </div>

        {/* ═════════════════════════════════════════════════════════════════════ */}
        {/* ── CARE FINDER (FAMILY / PATIENT) VIEW ─────────────────────────── */}
        {/* ═════════════════════════════════════════════════════════════════════ */}
        {activeTabRole === 'patient' && (
          <div className="portal-content care-finder-theme animate-fade-in">
            {/* Care Finder Hero Header */}
            <div className="dash-hero-card glass-card cf-hero">
              <div className="hero-profile-info">
                <div className="hero-avatar cf-avatar">
                  <img
                    src={`https://ui-avatars.com/api/?name=${encodeURIComponent(userName)}&size=120&background=3b82f6&color=fff&bold=true&format=svg`}
                    alt={userName}
                  />
                  <span className="hero-badge-check" title="Identity Verified"><BadgeCheck size={18} /></span>
                </div>
                <div className="hero-text-block">
                  <div className="hero-title-row">
                    <h1>Welcome Back, {userName} 👋</h1>
                    <span className="tag-badge cf-tag"><ShieldCheck size={13} /> Family Safety Protected</span>
                  </div>
                  <p className="hero-subtitle">
                    Care Finder ID: <code>{userUniqueId}</code> • Managed under AI CareMatch Trust Engine
                  </p>
                  <div className="hero-quick-chips">
                    <span className="chip"><MapPin size={12} /> Banjara Hills, Hyderabad</span>
                    <span className="chip"><Shield size={12} /> 100% Background Verified Care</span>
                    <span className="chip"><Lock size={12} /> 4-Hr Dedicated Focus Guarantee</span>
                  </div>
                </div>
              </div>
              <div className="hero-actions-cluster">
                <button className="btn-primary btn-glow" onClick={() => navigate('/search')}>
                  <Search size={16} /> Find a Caregiver
                </button>
                <button className="btn-secondary" onClick={() => navigate('/whatsapp')}>
                  <Zap size={16} /> WhatsApp Booking Bot
                </button>
              </div>
            </div>

            {/* Key Trust & Safety Metric Cards */}
            <div className="metrics-grid">
              <div className="metric-card glass-card">
                <div className="metric-icon-wrap blue"><Activity size={22} /></div>
                <div className="metric-details">
                  <span className="metric-label">Active Care Sessions</span>
                  <div className="metric-value-row">
                    <span className="metric-number">1</span>
                    <span className="metric-badge green">🟢 Dedicated On-Duty</span>
                  </div>
                </div>
              </div>
              <div className="metric-card glass-card">
                <div className="metric-icon-wrap purple"><CheckCircle size={22} /></div>
                <div className="metric-details">
                  <span className="metric-label">Completed Sessions</span>
                  <div className="metric-value-row">
                    <span className="metric-number">2</span>
                    <span className="metric-badge purple">100% Safe History</span>
                  </div>
                </div>
              </div>
              <div className="metric-card glass-card">
                <div className="metric-icon-wrap teal"><ScoreGauge score={94} size={42} strokeWidth={4} label="" /></div>
                <div className="metric-details">
                  <span className="metric-label">Avg Caregiver Trust</span>
                  <div className="metric-value-row">
                    <span className="metric-number">94/100</span>
                    <span className="metric-badge teal">Elite Tier Pro</span>
                  </div>
                </div>
              </div>
              <div className="metric-card glass-card">
                <div className="metric-icon-wrap amber"><ShieldAlert size={22} /></div>
                <div className="metric-details">
                  <span className="metric-label">Safety & SOS Status</span>
                  <div className="metric-value-row">
                    <span className="metric-number">Protected</span>
                    <span className="metric-badge green">24/7 Rapid Link</span>
                  </div>
                </div>
              </div>
            </div>

            {/* AI Care Synthesis & Routine Digest Card */}
            <AiCareSummaryCard
              onOpenJournalHistory={() => {
                setJournalForBooking(cfBookings[0] || { id: 'BK-101', caregiverName: 'Priya Sharma', careRecipient: 'Diya Reddy (7yo)' });
                setJournalModalOpen(true);
              }}
            />

            {/* Active Recurring Care Subscriptions */}
            {subscriptions && subscriptions.length > 0 && (
              <div className="dash-section">
                <div className="section-header">
                  <div>
                    <h2><Repeat size={20} color="#8B5CF6" /> Active Recurring Care Subscriptions</h2>
                    <p className="section-sub" style={{ margin: '2px 0 0', fontSize: '12px', color: 'var(--text-muted)' }}>
                      Automated multi-week care routines with guaranteed dedicated provider locks
                    </p>
                  </div>
                  <span className="section-pill">{subscriptions.filter(s => s.status === 'active').length} Active Plans</span>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(340px, 1fr))', gap: 'var(--space-4)', marginBottom: 'var(--space-6)' }}>
                  {subscriptions.map((sub) => {
                    const isActive = sub.status === 'active';
                    return (
                      <div key={sub.id} className="glass-card" style={{ padding: 'var(--space-5)', borderRadius: 'var(--radius-xl)', border: isActive ? '1px solid rgba(139, 92, 246, 0.3)' : '1px solid var(--border-glass)', background: isActive ? 'linear-gradient(135deg, rgba(139, 92, 246, 0.08) 0%, rgba(15, 23, 42, 0.4) 100%)' : 'rgba(255,255,255,0.02)' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '8px' }}>
                          <div>
                            <span style={{ fontSize: '10px', fontWeight: 700, color: '#A78BFA', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                              PLAN #{sub.id} • {sub.frequency.toUpperCase()}
                            </span>
                            <h4 style={{ margin: '2px 0 0', fontSize: '15px' }}>{sub.caregiverName} ➔ {sub.careRecipient}</h4>
                          </div>
                          <span className={`badge ${isActive ? 'badge-trust' : 'badge-risk'}`}>
                            {isActive ? '🟢 Active Routine' : '⏸️ Paused'}
                          </span>
                        </div>

                        <div style={{ background: 'rgba(255,255,255,0.03)', padding: '10px', borderRadius: '8px', fontSize: '12px', display: 'flex', flexDirection: 'column', gap: '4px', margin: '8px 0' }}>
                          <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                            <span style={{ color: 'var(--text-muted)' }}>Schedule:</span>
                            <strong>{sub.frequencyName}</strong>
                          </div>
                          <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                            <span style={{ color: 'var(--text-muted)' }}>Monthly Billing:</span>
                            <strong style={{ color: '#34D399' }}>₹{sub.monthlyTotal.toLocaleString('en-IN')}/mo ({sub.discountPercent}% OFF)</strong>
                          </div>
                          <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                            <span style={{ color: 'var(--text-muted)' }}>Next Auto-Renewal:</span>
                            <span>{sub.nextBillingDate}</span>
                          </div>
                        </div>

                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', paddingTop: '8px', borderTop: '1px solid var(--border-glass)' }}>
                          <button
                            type="button"
                            className="btn-ghost btn-sm"
                            style={{ fontSize: '11px', display: 'flex', alignItems: 'center', gap: '4px', color: isActive ? '#FBBF24' : '#34D399' }}
                            onClick={() => handleToggleSub(sub.id, sub.status)}
                          >
                            {isActive ? <><Pause size={12} /> Pause Subscription</> : <><Play size={12} /> Resume Routine</>}
                          </button>
                          <button
                            type="button"
                            className="btn-secondary btn-sm"
                            style={{ fontSize: '11px' }}
                            onClick={() => {
                              setJournalForBooking({ id: sub.id, caregiverName: sub.caregiverName, careRecipient: sub.careRecipient, domain: sub.domain });
                              setJournalModalOpen(true);
                            }}
                          >
                            <FileText size={12} /> View Care Logs
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Real-Time Shift Tracking & Geofence (Live Active Session) */}
            <div className="dash-section">
              <div className="section-header">
                <h2><Activity size={20} color="#3B82F6" /> Real-Time Live Session Tracking</h2>
                <span className="section-pill">GPS Geofence & Check-In Active</span>
              </div>
              <LiveSessionTracker
                session={{
                  id: cfBookings[0]?.id || 'BK-101',
                  bookingId: cfBookings[0]?.id || 'BK-101',
                  caregiverName: 'Priya Sharma',
                  patientName: 'Diya Reddy (Child Care)',
                  category: 'child',
                  location: 'Banjara Hills, Road No. 12, Hyderabad',
                  coordinates: { lat: 17.4156, lng: 78.4350 },
                  geofenceRadiusMeters: 250,
                  startTime: '03:00 PM',
                  endTime: '07:00 PM',
                  durationHours: 4,
                  rate: 1800,
                  tasks: [
                    'Check-in at residence with digital safety QR verification',
                    'Administer afternoon ADHD focus routine and speech exercises',
                    'Healthy snack supervision and hydration log',
                    'Evening educational playtime & bedtime wind-down'
                  ]
                }}
                isCaregiver={false}
                onSessionCompleted={(completedSession) => {
                  setNotifications(prev => [
                    { id: Date.now(), title: '🎉 Session Completed & Escrow Released', body: `Session #${completedSession.id} successfully finished. Funds released to Priya Sharma.`, time: 'Just now', type: 'payout' },
                    ...prev
                  ]);
                }}
              />
            </div>

            {/* Booking Management & History */}
            <div className="dash-section">
              <div className="section-header-with-tabs">
                <div>
                  <h2><Calendar size={20} color="#8B5CF6" /> Booking Management & Sessions</h2>
                  <p className="section-sub">Track real-time statuses, view receipts, and rate finished care shifts</p>
                </div>
                <div className="filter-tabs">
                  <button className={`filter-tab ${bookingFilter === 'all' ? 'active' : ''}`} onClick={() => setBookingFilter('all')}>All ({cfBookings.length})</button>
                  <button className={`filter-tab ${bookingFilter === 'confirmed' ? 'active' : ''}`} onClick={() => setBookingFilter('confirmed')}>Active ({activeCount})</button>
                  <button className={`filter-tab ${bookingFilter === 'completed' ? 'active' : ''}`} onClick={() => setBookingFilter('completed')}>Completed ({completedCount})</button>
                </div>
              </div>

              <div className="bookings-grid">
                {filteredBookings.map((b) => {
                  const cg = getCg(b.caregiverId) || { id: b.caregiverId, name: b.caregiverName, pricing: 450, location: { name: 'Banjara Hills' } };
                  const isCompleted = b.status === 'completed';
                  const isCancelled = b.status === 'cancelled';
                  return (
                    <div key={b.id} className={`booking-card glass-card ${isCompleted ? 'past' : isCancelled ? 'cancelled-card' : 'active-card'}`}>
                      <div className="booking-top">
                        <div className="booking-avatar-img">
                          <img src={cg?.photo || `https://ui-avatars.com/api/?name=${encodeURIComponent(b.caregiverName)}&size=100&background=60a5fa&color=fff&format=svg`} alt={b.caregiverName} />
                        </div>
                        <div className="booking-info">
                          <h4>{b.caregiverName}</h4>
                          <span className="booking-domain">
                            {b.domain === 'child' ? '👶 Child Care' : b.domain === 'human' ? '🧑 Human & Elder Care' : '🐾 Pet Care'}
                          </span>
                          <span className="booking-id">ID: {cg?.uniqueId || 'CG-10001'} • Booking #{b.id}</span>
                        </div>
                        <span className={`badge ${isCompleted ? 'badge-completed' : isCancelled ? 'badge-risk' : 'badge-trust'}`}>
                          {isCompleted ? '✅ Completed' : isCancelled ? '❌ Cancelled' : '🟢 Active Shift'}
                        </span>
                      </div>

                      <div className="booking-details-box">
                        <div className="detail-item">
                          <Calendar size={13} />
                          <span>{b.shiftDate}</span>
                        </div>
                        <div className="detail-item">
                          <MapPin size={13} />
                          <span>{b.address}</span>
                        </div>
                        <div className="detail-item">
                          <IndianRupee size={13} />
                          <span>₹{b.rate} Total</span>
                        </div>
                      </div>

                      <div className="booking-actions">
                        <button
                          className="btn-secondary btn-sm"
                          onClick={() => setSafetyPassBooking({ booking: b, caregiver: cg })}
                        >
                          <Ticket size={13} /> Safety Pass
                        </button>

                        {b.status === 'confirmed' && (
                          <>
                            <button
                              className="btn-primary btn-sm"
                              style={{ background: 'linear-gradient(135deg, #10B981 0%, #059669 100%)', border: 'none' }}
                              onClick={() => handleCompleteSessionByPatient(b)}
                              title="Mark this shift completed and submit rating"
                            >
                              <CheckCircle size={13} /> Complete & Rate
                            </button>
                            <button
                              type="button"
                              className="btn-ghost btn-sm"
                              style={{ color: '#FBBF24', border: '1px dashed rgba(251,191,36,0.4)', fontSize: '11px' }}
                              onClick={() => {
                                setReplacementCaregiver(cg);
                                setReplacementBooking(b);
                                setReplacementModalOpen(true);
                              }}
                              title="Simulate provider cancellation and trigger AI Replacement"
                            >
                              <Sparkles size={12} /> AI Replace
                            </button>
                            <button
                              className="btn-ghost btn-sm"
                              style={{ color: '#F87171' }}
                              onClick={() => handleCancelBooking(b.id)}
                            >
                              <X size={13} /> Cancel
                            </button>
                          </>
                        )}

                        {isCompleted && (
                          isRated(b.id) ? (
                            <span className="rated-badge"><CheckCircle size={14} /> Rated ⭐ 5.0</span>
                          ) : (
                            <button
                              className="btn-primary btn-sm"
                              onClick={() => setFeedbackFor({ ...cg, bookingId: b.id })}
                            >
                              <Star size={13} /> Rate Caregiver
                            </button>
                          )
                        )}

                        <button
                          className="btn-ghost btn-sm"
                          onClick={() => setRebookModalCaregiver(cg)}
                        >
                          <RefreshCw size={13} /> Re-book
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Saved / Favourite Caregivers */}
            {favCaregivers.length > 0 && (
              <div className="dash-section">
                <div className="section-header">
                  <h2><Heart size={20} color="#F87171" fill="#F87171" /> Favorite Verified Caregivers</h2>
                  <span className="section-pill">{favCaregivers.length} Saved Profiles</span>
                </div>
                <div className="favorites-grid">
                  {favCaregivers.map(cg => (
                    <div key={cg.id} className="fav-card glass-card">
                      <div className="fav-top">
                        <img src={cg.photo} alt={cg.name} className="fav-avatar" />
                        <div className="fav-info">
                          <h4>{cg.name}</h4>
                          <span className="fav-category">{cg.category === 'child' ? '👶 Child Care' : cg.category === 'human' ? '🧑 Elder Care' : '🐾 Pet Care'}</span>
                          <span className="fav-score"><Star size={12} fill="#F59E0B" color="#F59E0B" /> Trust Score: <strong>{cg.trustScore}/100</strong></span>
                        </div>
                      </div>
                      <div className="fav-tags">
                        {cg.specializations.slice(0, 3).map((s, idx) => (
                          <span key={idx} className="spec-tag">{s}</span>
                        ))}
                      </div>
                      <div className="fav-actions">
                        <button className="btn-primary btn-sm" onClick={() => setRebookModalCaregiver(cg)}>
                          <Calendar size={13} /> Book Shift
                        </button>
                        <button className="btn-secondary btn-sm" onClick={() => navigate(`/caregiver/${cg.id}`)}>
                          View Profile
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Family Safety & Medical Profile */}
            <div className="dash-section">
              <div className="section-header">
                <h2><Shield size={20} color="#10B981" /> Family Safety & Emergency Profile</h2>
                <span className="section-pill">Encrypted & Shared on Dispatch</span>
              </div>
              <div className="safety-card glass-card">
                {!editingSafety ? (
                  <>
                    <div className="safety-grid">
                      <div className="safety-item">
                        <span className="safety-label">Emergency Contact</span>
                        <span className="safety-value">{safetyProfile.emergencyContact || 'Not set'}</span>
                      </div>
                      <div className="safety-item">
                        <span className="safety-label">Emergency Phone</span>
                        <span className="safety-value">{safetyProfile.emergencyPhone || 'Not set'}</span>
                      </div>
                      <div className="safety-item">
                        <span className="safety-label">Blood Group</span>
                        <span className="safety-value">{safetyProfile.bloodGroup || 'Not set'}</span>
                      </div>
                      <div className="safety-item">
                        <span className="safety-label">Allergies</span>
                        <span className="safety-value">{safetyProfile.allergies || 'None specified'}</span>
                      </div>
                      <div className="safety-item full">
                        <span className="safety-label">Health & Care Conditions</span>
                        <span className="safety-value">{safetyProfile.healthConditions || 'None specified'}</span>
                      </div>
                      <div className="safety-item full">
                        <span className="safety-label">Medications & Special Routine Instructions</span>
                        <span className="safety-value">{safetyProfile.medications || 'None specified'}</span>
                      </div>
                    </div>
                    <div style={{ marginTop: 'var(--space-4)', display: 'flex', gap: 'var(--space-3)' }}>
                      <button className="btn-secondary btn-sm" onClick={() => setEditingSafety(true)}>
                        <FileText size={14} /> Edit Medical & Safety Profile
                      </button>
                      <span className="safety-hint">🔒 Automatically synced with Hyderabad Emergency Response Network</span>
                    </div>
                  </>
                ) : (
                  <div className="safety-form">
                    <div className="safety-form-grid">
                      <div className="form-group">
                        <label>Emergency Contact Name</label>
                        <input className="input-field" placeholder="e.g. Rajesh Reddy" value={safetyProfile.emergencyContact || ''} onChange={e => setSafetyProfile(p => ({...p, emergencyContact: e.target.value}))} />
                      </div>
                      <div className="form-group">
                        <label>Emergency Phone</label>
                        <input className="input-field" placeholder="e.g. +91 98480 22338" value={safetyProfile.emergencyPhone || ''} onChange={e => setSafetyProfile(p => ({...p, emergencyPhone: e.target.value}))} />
                      </div>
                      <div className="form-group">
                        <label>Blood Group</label>
                        <input className="input-field" placeholder="e.g. B+ Positive" value={safetyProfile.bloodGroup || ''} onChange={e => setSafetyProfile(p => ({...p, bloodGroup: e.target.value}))} />
                      </div>
                      <div className="form-group">
                        <label>Allergies</label>
                        <input className="input-field" placeholder="e.g. Penicillin, Peanuts" value={safetyProfile.allergies || ''} onChange={e => setSafetyProfile(p => ({...p, allergies: e.target.value}))} />
                      </div>
                      <div className="form-group full">
                        <label>Health & Chronic Conditions</label>
                        <input className="input-field" placeholder="e.g. Asthma, Hypertension, Mobility limits" value={safetyProfile.healthConditions || ''} onChange={e => setSafetyProfile(p => ({...p, healthConditions: e.target.value}))} />
                      </div>
                      <div className="form-group full">
                        <label>Medications & Care Instructions</label>
                        <input className="input-field" placeholder="e.g. Inhaler dosage, bedtime routines" value={safetyProfile.medications || ''} onChange={e => setSafetyProfile(p => ({...p, medications: e.target.value}))} />
                      </div>
                    </div>
                    <div style={{ display: 'flex', gap: 'var(--space-2)', marginTop: 'var(--space-4)' }}>
                      <button className="btn-primary btn-sm" onClick={() => saveSafetyProfile(safetyProfile)}>
                        <Check size={14} /> Save Profile Changes
                      </button>
                      <button className="btn-ghost btn-sm" onClick={() => setEditingSafety(false)}>Cancel</button>
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Structured Multi-Member Care Plans */}
            <div className="dash-section">
              <div className="section-header">
                <div>
                  <h2><Layers size={20} color="#8B5CF6" /> Family Care Plans & Member Profiles</h2>
                  <p className="section-sub" style={{ margin: '2px 0 0 0', fontSize: '12px', color: 'var(--text-muted)' }}>
                    Structured medical requirements, medication schedules & dietary instructions ingested by AI 6-Dimension Matching
                  </p>
                </div>
                <button
                  type="button"
                  className="btn-primary btn-sm"
                  onClick={() => {
                    setEditingPlan(null);
                    setIsPlanModalOpen(true);
                  }}
                >
                  <Plus size={14} /> Add Care Plan
                </button>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: 'var(--space-4)' }}>
                {carePlans.map((plan) => (
                  <div key={plan.id} className="glass-card" style={{ padding: 'var(--space-5)', borderRadius: 'var(--radius-xl)', display: 'flex', flexDirection: 'column', gap: 'var(--space-3)', border: '1px solid rgba(139, 92, 246, 0.25)' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                      <div style={{ display: 'flex', gap: 'var(--space-3)', alignItems: 'center' }}>
                        <div style={{
                          width: '44px', height: '44px', borderRadius: '12px',
                          background: plan.category === 'child' ? 'rgba(59, 130, 246, 0.15)' : plan.category === 'human' ? 'rgba(16, 185, 129, 0.15)' : 'rgba(245, 158, 11, 0.15)',
                          display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '20px'
                        }}>
                          {plan.category === 'child' ? '👶' : plan.category === 'human' ? '🧑' : '🐾'}
                        </div>
                        <div>
                          <h4 style={{ margin: '0 0 2px 0', fontSize: 'var(--fs-base)' }}>{plan.personName}</h4>
                          <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>{plan.relationship} • {plan.age}</span>
                        </div>
                      </div>
                      <button
                        type="button"
                        className="btn-ghost btn-sm"
                        style={{ padding: '4px 8px', fontSize: '11px' }}
                        onClick={() => {
                          setEditingPlan(plan);
                          setIsPlanModalOpen(true);
                        }}
                      >
                        Edit Plan
                      </button>
                    </div>

                    <div style={{ background: 'rgba(255, 255, 255, 0.03)', padding: '10px', borderRadius: '8px', fontSize: '12px', display: 'flex', flexDirection: 'column', gap: '6px' }}>
                      {plan.medicalConditions && (
                        <div>
                          <strong style={{ color: '#F87171' }}>🩺 Conditions:</strong> <span style={{ color: 'var(--text-secondary)' }}>{plan.medicalConditions}</span>
                        </div>
                      )}
                      {plan.dietaryRequirements && (
                        <div>
                          <strong style={{ color: '#FBBF24' }}>🥗 Diet:</strong> <span style={{ color: 'var(--text-secondary)' }}>{plan.dietaryRequirements}</span>
                        </div>
                      )}
                      {plan.mobilityNeeds && (
                        <div>
                          <strong style={{ color: '#60A5FA' }}>🚶 Mobility:</strong> <span style={{ color: 'var(--text-secondary)' }}>{plan.mobilityNeeds}</span>
                        </div>
                      )}
                    </div>

                    {plan.medications && plan.medications.length > 0 && (
                      <div>
                        <span style={{ fontSize: '11px', color: 'var(--text-muted)', fontWeight: 600, display: 'block', marginBottom: '4px' }}>MEDICATION SCHEDULE:</span>
                        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '4px' }}>
                          {plan.medications.map((m, idx) => (
                            <span key={idx} style={{ fontSize: '10px', background: 'rgba(59, 130, 246, 0.1)', color: '#93C5FD', border: '1px solid rgba(59, 130, 246, 0.25)', padding: '2px 6px', borderRadius: '4px' }}>
                              💊 {m.name} ({m.dosage} @ {m.time})
                            </span>
                          ))}
                        </div>
                      </div>
                    )}

                    {plan.preferredSkills && plan.preferredSkills.length > 0 && (
                      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '4px', marginTop: 'auto' }}>
                        {plan.preferredSkills.map((sk, idx) => (
                          <span key={idx} style={{ fontSize: '10px', background: 'rgba(139, 92, 246, 0.12)', color: '#C084FC', padding: '2px 8px', borderRadius: '99px' }}>
                            ✓ {sk}
                          </span>
                        ))}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* ═════════════════════════════════════════════════════════════════════ */}
        {/* ── CAREGIVER (PROFESSIONAL HUB) VIEW ───────────────────────────── */}
        {/* ═════════════════════════════════════════════════════════════════════ */}
        {activeTabRole === 'caregiver' && (
          <div className="portal-content caregiver-theme animate-fade-in">
            {/* Caregiver Hero Header */}
            <div className="dash-hero-card glass-card cg-hero">
              <div className="hero-profile-info">
                <div className="hero-avatar cg-avatar">
                  <img
                    src="https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?w=300&auto=format&fit=crop&q=80"
                    alt="Priya Sharma"
                  />
                  <span className="hero-badge-check cg-badge-check" title="Level 4 Verified Pro"><BadgeCheck size={18} /></span>
                </div>
                <div className="hero-text-block">
                  <div className="hero-title-row">
                    <h1>Priya Sharma</h1>
                    <span className="tag-badge cg-tag">👶 Child Care Specialist • Level 4 Pro</span>
                  </div>
                  <p className="hero-subtitle">
                    Caregiver ID: <code>{userUniqueId}</code> • 8-Point Government & Police Cleared
                  </p>
                  <div className="hero-quick-chips">
                    <span className="chip"><Star size={12} fill="#F59E0B" color="#F59E0B" /> Trust Score: 92/100</span>
                    <span className="chip"><IndianRupee size={12} /> Rate: ₹450/hr</span>
                    <span className="chip"><MapPin size={12} /> Banjara Hills & Jubilee Hills</span>
                  </div>
                </div>
              </div>
              <div className="hero-actions-cluster">
                <button className="btn-primary btn-cg-glow" onClick={() => setIdCardOpen(true)}>
                  <QrCode size={16} /> Digital ID Badge
                </button>
                <button className="btn-secondary" onClick={() => navigate('/onboarding')}>
                  <BadgeCheck size={16} /> Edit Credentials
                </button>
              </div>
            </div>

            {/* Caregiver Real-Time Duty Status Control Bar */}
            <div className="cg-live-status-card glass-card">
              <div className="status-indicator-side">
                <span className={`status-beacon ${caregiverStatus}`} />
                <div>
                  <strong>
                    {caregiverStatus === 'available' && '🟢 LIVE STATUS: Available for Immediate AI Matching'}
                    {caregiverStatus === 'duty' && '🔴 LIVE STATUS: On 4-Hour Dedicated Focus Duty'}
                    {caregiverStatus === 'scheduled' && '🟡 LIVE STATUS: Taking Scheduled Advance Bookings'}
                    {caregiverStatus === 'offline' && '⚪ LIVE STATUS: Off-Duty / Rest Period'}
                  </strong>
                  <p>Status synchronizes in real-time across Hyderabad client search results.</p>
                </div>
              </div>
              <div className="status-selector-buttons">
                <button
                  type="button"
                  className={`status-btn ${caregiverStatus === 'available' ? 'active-avail' : ''}`}
                  onClick={() => updateCaregiverStatus('available')}
                >
                  🟢 Available Now
                </button>
                <button
                  type="button"
                  className={`status-btn ${caregiverStatus === 'duty' ? 'active-duty' : ''}`}
                  onClick={() => updateCaregiverStatus('duty')}
                >
                  🔴 4-Hr Duty Lock
                </button>
                <button
                  type="button"
                  className={`status-btn ${caregiverStatus === 'scheduled' ? 'active-sched' : ''}`}
                  onClick={() => updateCaregiverStatus('scheduled')}
                >
                  🟡 Scheduled Only
                </button>
                <button
                  type="button"
                  className={`status-btn ${caregiverStatus === 'offline' ? 'active-off' : ''}`}
                  onClick={() => updateCaregiverStatus('offline')}
                >
                  ⚪ Off-Duty
                </button>
              </div>
            </div>

            {/* Caregiver Performance Metric Cards */}
            <div className="metrics-grid">
              <div className="metric-card glass-card">
                <div className="metric-icon-wrap green"><Briefcase size={22} /></div>
                <div className="metric-details">
                  <span className="metric-label">Total Jobs Delivered</span>
                  <div className="metric-value-row">
                    <span className="metric-number">{totalJobsCount}</span>
                    <span className="metric-badge green">+3 This Week</span>
                  </div>
                </div>
              </div>
              <div className="metric-card glass-card">
                <div className="metric-icon-wrap emerald"><DollarSign size={22} /></div>
                <div className="metric-details">
                  <span className="metric-label">Month Earnings</span>
                  <div className="metric-value-row">
                    <span className="metric-number">₹{caregiverEarnings.toLocaleString('en-IN')}</span>
                    <span className="metric-badge green">↑ 18% vs Last Mo</span>
                  </div>
                </div>
              </div>
              <div className="metric-card glass-card">
                <div className="metric-icon-wrap violet"><ScoreGauge score={92} size={42} strokeWidth={4} label="" /></div>
                <div className="metric-details">
                  <span className="metric-label">AI Trust Rating</span>
                  <div className="metric-value-row">
                    <span className="metric-number">92/100</span>
                    <span className="metric-badge purple">Level 4 Master</span>
                  </div>
                </div>
              </div>
              <div className="metric-card glass-card">
                <div className="metric-icon-wrap amber"><Star size={22} /></div>
                <div className="metric-details">
                  <span className="metric-label">Client Satisfaction</span>
                  <div className="metric-value-row">
                    <span className="metric-number">4.98 ⭐</span>
                    <span className="metric-badge teal">99.2% Positive</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Active Shift Management (If on active assignment) */}
            {activeJob && (
              <div className="dash-section">
                <div className="section-header">
                  <h2><Lock size={20} color="#EF4444" /> Current Active Assignment (4-Hour Locked)</h2>
                  <span className="section-pill red">Dedicated Duty Active</span>
                </div>
                <div className="cg-active-shift-card glass-card">
                  <div className="active-shift-top">
                    <div className="patient-avatar-box">
                      <img src="https://ui-avatars.com/api/?name=Rajesh+Kumar&size=100&background=f59e0b&color=fff&bold=true&format=svg" alt={activeJob.patientName} />
                    </div>
                    <div className="active-patient-meta">
                      <h3>{activeJob.patientName} <span className="pt-id">({activeJob.patientId})</span></h3>
                      <p className="care-needs-desc"><strong>Care Need:</strong> {activeJob.careNeeds}</p>
                      <div className="active-pills-row">
                        <span><MapPin size={13} /> {activeJob.location}</span>
                        <span><Phone size={13} /> {activeJob.emergencyPhone}</span>
                        <span><IndianRupee size={13} /> ₹{activeJob.payout} Shift Payout</span>
                      </div>
                    </div>
                    <div className="active-timer-box">
                      <Clock size={20} color="#EF4444" />
                      <span className="timer-title">Dedicated Shift Time</span>
                      <span className="timer-val">2h 45m remaining</span>
                      <span className="timer-sub">No parallel dispatches</span>
                    </div>
                  </div>

                  <div className="active-shift-bottom">
                    <div className="safety-reminder">
                      <ShieldCheck size={16} color="#10B981" />
                      <span>Remember to check in with the family and confirm daily medication schedule.</span>
                    </div>
                    <div style={{ display: 'flex', gap: 'var(--space-2)', flexWrap: 'wrap', width: '100%' }}>
                      <button
                        type="button"
                        className="btn-secondary btn-sm"
                        style={{ flex: 1, minWidth: '160px' }}
                        onClick={() => {
                          setJournalForBooking({ id: activeJob.id, caregiverName: 'Priya Sharma', careRecipient: activeJob.patientName, domain: activeJob.category });
                          setJournalModalOpen(true);
                        }}
                      >
                        <FileText size={14} /> Log Care Journal
                      </button>
                      <button
                        type="button"
                        className="btn-primary btn-complete"
                        style={{ flex: 2, minWidth: '220px' }}
                        onClick={handleCompleteActiveJob}
                      >
                        <CheckCircle size={16} /> Mark Completed & Collect ₹{activeJob.payout}
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Caregiver Schedule & Daily Route Optimizer */}
            <RouteOptimizerView />

            {/* Incoming Match Requests Dispatch (Interactive) */}
            <div className="dash-section">
              <div className="section-header">
                <h2><Sparkles size={20} color="#10B981" /> Incoming AI Match Dispatches</h2>
                <span className="section-pill">{incomingRequests.length} Pending Requests</span>
              </div>

              {incomingRequests.length > 0 ? (
                <div className="requests-grid">
                  {incomingRequests.map((req) => (
                    <div key={req.id} className="request-card glass-card">
                      <div className="req-header">
                        <div className="req-avatar">
                          <img src={`https://ui-avatars.com/api/?name=${encodeURIComponent(req.patientName)}&size=80&background=f59e0b&color=fff&format=svg`} alt={req.patientName} />
                        </div>
                        <div className="req-info">
                          <h4>{req.patientName}</h4>
                          <span className="req-cat">{req.category === 'child' ? '👶 Child Care' : '🧑 Elder Care'} • {req.patientId}</span>
                        </div>
                        <span className="req-payout">₹{req.payout}</span>
                      </div>

                      <p className="req-desc">{req.careNeeds}</p>

                      <div className="req-meta">
                        <span><Calendar size={13} /> {req.timeSlot}</span>
                        <span><MapPin size={13} /> {req.location}</span>
                      </div>

                      <div className="req-actions">
                        <button
                          type="button"
                          className="btn-primary btn-sm btn-accept"
                          onClick={() => handleAcceptJob(req)}
                        >
                          <Check size={14} /> Accept Job (Lock 4-Hr)
                        </button>
                        <button
                          type="button"
                          className="btn-ghost btn-sm btn-decline"
                          onClick={() => handleDeclineJob(req.id)}
                        >
                          <X size={14} /> Decline
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="empty-requests glass-card">
                  <CheckCircle size={32} color="#10B981" />
                  <p>All current job dispatches reviewed. Stay Available to receive real-time matching notifications.</p>
                </div>
              )}
            </div>

            {/* Earnings & Financial Hub */}
            <div className="dash-section">
              <div className="section-header">
                <h2><IndianRupee size={20} color="#10B981" /> Earnings & Payout Analytics</h2>
                <span className="section-pill">Direct Bank & UPI Transfer</span>
              </div>

              <div className="earnings-analytics-card glass-card">
                <div className="earnings-split">
                  <div className="earn-box">
                    <span className="earn-label">Total Career Earnings</span>
                    <span className="earn-val gradient-text">₹{caregiverEarnings.toLocaleString('en-IN')}</span>
                    <span className="earn-sub">Across {totalJobsCount} completed care assignments</span>
                  </div>
                  <div className="earn-box highlight">
                    <span className="earn-label">Available for Instant Payout</span>
                    <span className="earn-val green">₹12,600</span>
                    <span className="earn-sub">Cleared & ready to transfer</span>
                  </div>
                  <div className="earn-box">
                    <span className="earn-label">Avg Session Earnings</span>
                    <span className="earn-val">₹1,850</span>
                    <span className="earn-sub">Top 5% highest earner in Hyderabad</span>
                  </div>
                </div>

                <div className="payout-action-row">
                  <div className="payout-method-info">
                    <span className="payout-icon">🏦</span>
                    <div>
                      <strong>Linked Account: HDFC Bank (A/C: •••• 4912)</strong>
                      <p>Instant UPI fallback: <code>priya.sharma@okaxis</code></p>
                    </div>
                  </div>
                  <button
                    type="button"
                    className="btn-primary btn-payout"
                    onClick={() => setPayoutModalOpen(true)}
                  >
                    <DollarSign size={16} /> Request Instant Payout (₹12,600)
                  </button>
                </div>
              </div>
            </div>

            {/* AI Trust Score & Certification Upgrade Pathway */}
            <div className="dash-section">
              <div className="section-header">
                <h2><Award size={20} color="#8B5CF6" /> Trust Score Growth & Skill Pathway</h2>
                <span className="section-pill">Unlock Higher Rates</span>
              </div>

              <div className="pathway-grid">
                <div className="pathway-card glass-card completed">
                  <div className="path-top">
                    <span className="path-icon">✅</span>
                    <div>
                      <h4>Level 1: 8-Point Gov Identity</h4>
                      <p>Aadhaar OCR, PAN & Live Face Match</p>
                    </div>
                  </div>
                  <span className="path-status verified">100% Completed</span>
                </div>

                <div className="pathway-card glass-card completed">
                  <div className="path-top">
                    <span className="path-icon">🛡️</span>
                    <div>
                      <h4>Level 2: Telangana Police Clearance</h4>
                      <p>Criminal background verification & safety check</p>
                    </div>
                  </div>
                  <span className="path-status verified">100% Verified</span>
                </div>

                <div className="pathway-card glass-card in-progress">
                  <div className="path-top">
                    <span className="path-icon">🩺</span>
                    <div>
                      <h4>Level 3: Medical Health Screening</h4>
                      <p>Vaccination records & physical fitness certificate</p>
                    </div>
                  </div>
                  <div className="path-progress-bar">
                    <div className="path-progress-fill" style={{ width: '60%' }} />
                  </div>
                  <span className="path-status progress">60% Done • Document Under Review</span>
                </div>

                <div className="pathway-card glass-card action-needed">
                  <div className="path-top">
                    <span className="path-icon">🩹</span>
                    <div>
                      <h4>Level 4: Pediatric & Elder First Aid (CPR)</h4>
                      <p>Boosts match rate by +18% & unlocks ₹550/hr tier</p>
                    </div>
                  </div>
                  <button
                    type="button"
                    className="btn-secondary btn-sm"
                    style={{ marginTop: 'var(--space-2)' }}
                    onClick={() => setCertModalOpen(true)}
                  >
                    <UploadCloud size={14} /> Upload First Aid Certificate
                  </button>
                </div>
              </div>
            </div>

            {/* Completed Job History & Client Reviews */}
            <div className="dash-section">
              <div className="section-header">
                <h2><CheckCircle size={20} color="#10B981" /> Completed Jobs & Client Reviews</h2>
                <span className="section-pill">{completedJobs.length} Recent Reviews</span>
              </div>

              <div className="completed-jobs-list">
                {completedJobs.map(job => (
                  <div key={job.id} className="completed-job-item glass-card">
                    <div className="cj-header">
                      <div className="cj-user">
                        <img src={`https://ui-avatars.com/api/?name=${encodeURIComponent(job.patientName)}&size=60&background=f59e0b&color=fff&format=svg`} alt={job.patientName} />
                        <div>
                          <strong>{job.patientName}</strong>
                          <span className="cj-meta">{job.date} • {job.hours} • {job.patientId}</span>
                        </div>
                      </div>
                      <div className="cj-payout-rating">
                        <span className="cj-earn">+₹{job.payout}</span>
                        <span className="cj-stars"><Star size={13} fill="#F59E0B" color="#F59E0B" /> {job.rating} ⭐</span>
                      </div>
                    </div>
                    <p className="cj-comment">"{job.feedback}"</p>
                  </div>
                ))}
              </div>
            </div>

            {/* Caregiver Live Notification Feed */}
            <div className="dash-section">
              <div className="section-header">
                <h2><Bell size={20} color="#3B82F6" /> Live Dispatch & Platform Alerts</h2>
                <span className="section-pill">Real-time Feed</span>
              </div>

              <div className="notif-list">
                {notifications.map((n) => (
                  <div key={n.id} className="notif-item glass-card">
                    <div className="notif-icon">
                      {n.type === 'job' ? '⚡' : n.type === 'payout' ? '💰' : '⭐'}
                    </div>
                    <div className="notif-content">
                      <strong>{n.title}</strong>
                      <p>{n.body}</p>
                      <span className="notif-time">{n.time}</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

      </div>

      {/* ── MODAL: Digital Safety Pass (Care Finder & Caregiver) ── */}
      {safetyPassBooking && (
        <div className="modal-overlay animate-fade-in" onClick={() => setSafetyPassBooking(null)}>
          <div className="safety-pass-card glass-card" onClick={(e) => e.stopPropagation()}>
            <div className="pass-header">
              <div className="pass-title">
                <ShieldCheck size={24} color="#10B981" />
                <span>AI CAREMATCH • DIGITAL SAFETY PASS</span>
              </div>
              <button type="button" className="modal-close-btn" onClick={() => setSafetyPassBooking(null)}><X size={18} /></button>
            </div>

            <div className="pass-body">
              <div className="pass-caregiver-row">
                <img
                  src={safetyPassBooking.caregiver?.photo || 'https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?w=300&auto=format&fit=crop&q=80'}
                  alt="Caregiver"
                  className="pass-avatar"
                />
                <div className="pass-cg-details">
                  <h3>{safetyPassBooking.caregiver?.name || safetyPassBooking.booking.caregiverName}</h3>
                  <span className="pass-domain-tag">
                    {safetyPassBooking.caregiver?.category === 'child' ? '👶 Child Care Specialist' : safetyPassBooking.caregiver?.category === 'human' ? '🧑 Human & Elder Specialist' : '🐾 Pet Handler Specialist'}
                  </span>
                  <div className="pass-ids">
                    <span>Caregiver ID: <strong>{safetyPassBooking.caregiver?.uniqueId || 'CG-10001'}</strong></span>
                    <span>Booking: <strong>#{safetyPassBooking.booking.id}</strong></span>
                  </div>
                </div>
              </div>

              <div className="pass-guarantees">
                <div className="pass-guarantee-item">
                  <span className="guarantee-icon">🔒</span>
                  <div>
                    <strong>4-Hour Dedicated Lock Guarantee</strong>
                    <p>Caregiver is strictly locked from taking other jobs during your active care window.</p>
                  </div>
                </div>
                <div className="pass-guarantee-item">
                  <span className="guarantee-icon">🪪</span>
                  <div>
                    <strong>8-Point Government Verified</strong>
                    <p>Live Selfie, Aadhaar/PAN OCR, Telangana Police Background Clearance & Medical check.</p>
                  </div>
                </div>
                <div className="pass-guarantee-item">
                  <span className="guarantee-icon">🚨</span>
                  <div>
                    <strong>24/7 SOS Rapid Protection</strong>
                    <p>Emergency tracking enabled directly with Hyderabad rapid response safety team.</p>
                  </div>
                </div>
              </div>

              <div className="pass-qr-section">
                <div className="pass-qr-box">
                  <QrCode size={72} color="#A78BFA" />
                  <span>SCAN TO AUTHENTICATE</span>
                </div>
                <div className="pass-qr-text">
                  <strong>Live Identity Match Hash:</strong>
                  <code>SHA256: 8f4e-992c-auth-2026</code>
                  <p>Present or scan this digital safety pass upon caregiver arrival at your premises.</p>
                </div>
              </div>
            </div>

            <div className="pass-footer">
              <button type="button" className="btn-primary" style={{ width: '100%' }} onClick={() => setSafetyPassBooking(null)}>
                ✅ Verified & Confirmed
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── MODAL: Caregiver Digital ID Card ── */}
      {idCardOpen && (
        <div className="modal-overlay animate-fade-in" onClick={() => setIdCardOpen(false)}>
          <div className="id-card-modal glass-card" onClick={(e) => e.stopPropagation()}>
            <div className="id-card-header">
              <Shield size={22} color="#10B981" />
              <span>OFFICIAL CAREGIVER CREDENTIAL CARD</span>
              <button type="button" className="modal-close-btn" onClick={() => setIdCardOpen(false)}><X size={18} /></button>
            </div>
            <div className="id-card-body">
              <div className="id-card-photo-box">
                <img src="https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?w=300&auto=format&fit=crop&q=80" alt="Priya Sharma" />
                <span className="id-verified-seal">⭐ VERIFIED PRO</span>
              </div>
              <div className="id-card-details">
                <h2>Priya Sharma</h2>
                <span className="id-role">Certified Child Care Specialist</span>
                <div className="id-meta-grid">
                  <div><span>Caregiver ID:</span><strong>CG-10001</strong></div>
                  <div><span>Status:</span><strong style={{ color: '#10B981' }}>Active Pro</strong></div>
                  <div><span>Trust Score:</span><strong>92 / 100</strong></div>
                  <div><span>Police Clear:</span><strong>Verified 2026</strong></div>
                </div>
              </div>
            </div>
            <div className="id-card-qr-footer">
              <QrCode size={56} color="#A78BFA" />
              <div>
                <span style={{ fontSize: '11px', color: '#94A3B8' }}>Digital Proof of Accreditation</span>
                <code style={{ display: 'block', fontSize: '10px', color: '#A78BFA' }}>SEC-AUTH: TELANGANA-CG-2026-991</code>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ── MODAL: Request Payout ── */}
      {payoutModalOpen && (
        <div className="modal-overlay animate-fade-in" onClick={() => setPayoutModalOpen(false)}>
          <div className="payout-modal glass-card" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header-simple">
              <h3><DollarSign size={20} color="#10B981" /> Instant Payout Request</h3>
              <button type="button" className="modal-close-btn" onClick={() => setPayoutModalOpen(false)}><X size={18} /></button>
            </div>
            <div className="payout-modal-content">
              <div className="payout-amount-card">
                <span>Transfer Amount</span>
                <h2>₹12,600</h2>
                <span className="payout-free">Zero Processing Fee • 100% Instant Credit</span>
              </div>
              <div className="payout-destination">
                <label>Transfer Destination</label>
                <div className="dest-option selected">
                  <span>📱 UPI ID: <strong>priya.sharma@okaxis</strong></span>
                  <CheckCircle size={16} color="#10B981" />
                </div>
                <div className="dest-option">
                  <span>🏦 Bank Account: HDFC Bank (A/C: •••• 4912)</span>
                </div>
              </div>

              {payoutSuccessMsg ? (
                <div className="payout-success-box">
                  <CheckCircle size={20} color="#10B981" />
                  <p>{payoutSuccessMsg}</p>
                </div>
              ) : (
                <button
                  type="button"
                  className="btn-primary"
                  style={{ width: '100%', marginTop: 'var(--space-4)' }}
                  onClick={handleRequestPayout}
                >
                  Confirm & Transfer ₹12,600
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ── MODAL: Upload First Aid Certificate ── */}
      {certModalOpen && (
        <div className="modal-overlay animate-fade-in" onClick={() => setCertModalOpen(false)}>
          <div className="cert-modal glass-card" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header-simple">
              <h3><Award size={20} color="#8B5CF6" /> Upload CPR & First Aid Certificate</h3>
              <button type="button" className="modal-close-btn" onClick={() => setCertModalOpen(false)}><X size={18} /></button>
            </div>
            <div className="cert-modal-body">
              <p>Upload your Red Cross, St. John Ambulance, or accredited First Aid PDF/image to unlock the Level 4 Pro Trust badge and higher hourly rates.</p>
              <div className="upload-dropzone" onClick={handleUploadCertificate}>
                <UploadCloud size={36} color="#8B5CF6" />
                <strong>Click to Select or Drop Certificate File</strong>
                <span>Supports PDF, PNG, JPG (Max 10MB)</span>
              </div>
              {certSuccessMsg && (
                <div className="payout-success-box" style={{ marginTop: 'var(--space-3)' }}>
                  <p>{certSuccessMsg}</p>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ── MODAL: Care Finder Rating Modal ── */}
      {feedbackFor && (
        <FeedbackModal
          caregiver={feedbackFor}
          onClose={() => setFeedbackFor(null)}
          onSubmit={handleFeedbackSubmit}
        />
      )}

      {/* ── MODAL: Quick Re-Book Caregiver ── */}
      {rebookModalCaregiver && (
        <div className="modal-overlay animate-fade-in" onClick={() => !rebookSuccessMsg && setRebookModalCaregiver(null)}>
          <div className="booking-modal-card glass-card" onClick={(e) => e.stopPropagation()} style={{ maxWidth: 480, padding: 'var(--space-6)', borderRadius: 'var(--radius-2xl)', background: 'var(--bg-card)', border: '1px solid var(--border-glass)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 'var(--space-4)' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-2)' }}>
                <Sparkles size={20} color="#818CF8" />
                <h3 style={{ fontSize: 'var(--fs-lg)' }}>Quick Re-Book Caregiver</h3>
              </div>
              <button type="button" className="modal-close-btn" onClick={() => setRebookModalCaregiver(null)}><X size={18} /></button>
            </div>

            {rebookSuccessMsg ? (
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', textAlign: 'center', padding: 'var(--space-6) 0', gap: 'var(--space-3)' }}>
                <CheckCircle size={56} color="#10B981" />
                <h3>{rebookSuccessMsg}</h3>
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-4)' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-3)', padding: 'var(--space-3)', background: 'rgba(255,255,255,0.03)', borderRadius: 'var(--radius-lg)', border: '1px solid var(--border-glass)' }}>
                  <img src={rebookModalCaregiver.photo || 'https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?w=300&auto=format&fit=crop&q=80'} alt={rebookModalCaregiver.name} style={{ width: 44, height: 44, borderRadius: '50%', objectFit: 'cover' }} />
                  <div>
                    <strong>{rebookModalCaregiver.name}</strong>
                    <span style={{ fontSize: 'var(--fs-xs)', color: 'var(--text-tertiary)', display: 'block' }}>{rebookModalCaregiver.location?.name || 'Banjara Hills'} • ₹{rebookModalCaregiver.pricing || 450}/hr</span>
                  </div>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 'var(--space-3)' }}>
                  <div>
                    <label style={{ display: 'block', fontSize: 'var(--fs-xs)', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: 4 }}>Date</label>
                    <input
                      type="date"
                      className="input-field"
                      value={rebookDate}
                      min={new Date().toISOString().split('T')[0]}
                      onChange={(e) => setRebookDate(e.target.value)}
                    />
                  </div>
                  <div>
                    <label style={{ display: 'block', fontSize: 'var(--fs-xs)', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: 4 }}>Time</label>
                    <input
                      type="time"
                      className="input-field"
                      value={rebookTime}
                      onChange={(e) => setRebookTime(e.target.value)}
                    />
                  </div>
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: 'var(--fs-xs)', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: 4 }}>Shift Duration: {rebookDuration} Hours</label>
                  <input
                    type="range"
                    min="1"
                    max="12"
                    value={rebookDuration}
                    onChange={(e) => setRebookDuration(Number(e.target.value))}
                    style={{ width: '100%', accentColor: 'var(--primary-500)' }}
                  />
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '11px', color: 'var(--text-muted)' }}>
                    <span>1 hr</span>
                    <span>4 hrs (Half Day)</span>
                    <span>8 hrs (Full Day)</span>
                    <span>12 hrs</span>
                  </div>
                </div>

                <div style={{ padding: 'var(--space-3) var(--space-4)', background: 'rgba(79, 70, 229, 0.08)', borderRadius: 'var(--radius-lg)', border: '1px dashed rgba(79,70,229,0.3)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span style={{ fontSize: 'var(--fs-sm)', color: 'var(--text-secondary)' }}>Estimated Total</span>
                  <strong style={{ fontSize: 'var(--fs-base)', color: '#60A5FA' }}>₹{(rebookModalCaregiver.pricing || 450) * rebookDuration}</strong>
                </div>

                <div style={{ display: 'flex', gap: 'var(--space-3)', marginTop: 'var(--space-2)' }}>
                  <button className="btn-secondary" style={{ flex: 1 }} onClick={() => setRebookModalCaregiver(null)}>Cancel</button>
                  <button className="btn-primary" style={{ flex: 1 }} onClick={handleConfirmRebook}>Confirm & Book</button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ── Structured Care Plan Modal ── */}
      <CarePlanModal
        isOpen={isPlanModalOpen}
        initialPlan={editingPlan}
        onClose={() => {
          setIsPlanModalOpen(false);
          setEditingPlan(null);
        }}
        onSave={handleSaveCarePlan}
      />

      {/* ── Digital Care Journal Modal ── */}
      <CareJournalModal
        isOpen={journalModalOpen}
        onClose={() => setJournalModalOpen(false)}
        bookingData={journalForBooking || {}}
        onSaved={(entry) => {
          setCareJournals(prev => [entry, ...prev]);
          setNotifications(prev => [
            { id: Date.now(), title: '📝 Care Journal Logged', body: `Care report for ${entry.careRecipient} successfully stored and synced.`, time: 'Just now', type: 'trust' },
            ...prev
          ]);
        }}
      />

      {/* ── AI Emergency Auto-Replacement Modal ── */}
      <ReplacementModal
        isOpen={replacementModalOpen}
        onClose={() => setReplacementModalOpen(false)}
        cancelledCaregiver={replacementCaregiver}
        bookingData={replacementBooking || {}}
        onSelectReplacement={(candidate) => {
          setNotifications(prev => [
            { id: Date.now(), title: '⚡ Caregiver Auto-Replaced', body: `Shift seamlessly transferred to ${candidate.caregiver.name} with ETA ${candidate.etaMinutes} mins.`, time: 'Just now', type: 'job' },
            ...prev
          ]);
        }}
      />

      {/* ═════════════════════════════════════════════════════════════════════ */}
      {/* ── DASHBOARD STYLES ────────────────────────────────────────────── */}
      {/* ═════════════════════════════════════════════════════════════════════ */}
      <style>{`
        .dashboard-page {
          padding-top: 88px;
          padding-bottom: var(--space-16);
          min-height: 100vh;
        }


        /* ── Control Bar / Switcher ── */
        .dashboard-control-bar {
          display: flex;
          justify-content: space-between;
          align-items: center;
          padding: var(--space-3) var(--space-5);
          margin-bottom: var(--space-6);
          border-radius: var(--radius-xl);
          background: rgba(15, 13, 26, 0.7);
          border: 1px solid var(--border-glass);
          flex-wrap: wrap;
          gap: var(--space-3);
        }
        .control-left { display: flex; align-items: center; gap: var(--space-3); flex-wrap: wrap; }
        .control-label { font-size: 11px; font-weight: 700; letter-spacing: 0.5px; color: var(--text-muted); }
        .role-switch-pills { display: flex; gap: var(--space-2); background: rgba(0,0,0,0.3); padding: 4px; border-radius: var(--radius-full); }
        .role-pill {
          display: flex; align-items: center; gap: var(--space-2);
          padding: 6px 14px; border-radius: var(--radius-full);
          font-size: var(--fs-xs); font-weight: 600; cursor: pointer;
          background: transparent; border: 1px solid transparent;
          color: var(--text-secondary); transition: all 0.2s;
        }
        .role-pill:hover { color: var(--text-primary); }
        .role-pill.cf-active {
          background: rgba(59, 130, 246, 0.2);
          border-color: #3B82F6;
          color: #93C5FD;
          box-shadow: 0 0 12px rgba(59, 130, 246, 0.25);
        }
        .role-pill.cg-active {
          background: rgba(16, 185, 129, 0.2);
          border-color: #10B981;
          color: #6EE7B7;
          box-shadow: 0 0 12px rgba(16, 185, 129, 0.25);
        }
        .live-pill {
          display: flex; align-items: center; gap: 6px;
          font-size: 11px; font-weight: 600; color: #10B981;
          background: rgba(16, 185, 129, 0.1); padding: 4px 10px;
          border-radius: var(--radius-full); border: 1px solid rgba(16, 185, 129, 0.2);
        }
        .pulse-beacon {
          width: 8px; height: 8px; border-radius: 50%;
          background: #10B981; box-shadow: 0 0 8px #10B981;
          animation: pulse 1.5s infinite;
        }

        /* ── Hero Card ── */
        .dash-hero-card {
          padding: var(--space-6) var(--space-8);
          border-radius: var(--radius-2xl);
          margin-bottom: var(--space-6);
          display: flex;
          justify-content: space-between;
          align-items: center;
          gap: var(--space-6);
          flex-wrap: wrap;
          position: relative;
          overflow: hidden;
        }
        .cf-hero {
          background: linear-gradient(135deg, rgba(30, 58, 138, 0.25) 0%, rgba(15, 23, 42, 0.6) 100%);
          border: 1px solid rgba(59, 130, 246, 0.3);
        }
        .cg-hero {
          background: linear-gradient(135deg, rgba(6, 78, 59, 0.25) 0%, rgba(15, 23, 42, 0.6) 100%);
          border: 1px solid rgba(16, 185, 129, 0.3);
        }
        .hero-profile-info { display: flex; align-items: center; gap: var(--space-5); }
        .hero-avatar {
          width: 76px; height: 76px; border-radius: var(--radius-full);
          position: relative; overflow: visible; flex-shrink: 0;
        }
        .hero-avatar img {
          width: 100%; height: 100%; object-fit: cover;
          border-radius: var(--radius-full);
        }
        .cf-avatar img { border: 3px solid #3B82F6; }
        .cg-avatar img { border: 3px solid #10B981; }
        .hero-badge-check {
          position: absolute; bottom: 0; right: 0;
          background: #1E3A8A; color: #60A5FA;
          border-radius: 50%; width: 22px; height: 22px;
          display: flex; align-items: center; justify-content: center;
          border: 2px solid #0F172A;
        }
        .cg-badge-check { background: #064E3B; color: #34D399; }
        .hero-title-row { display: flex; align-items: center; gap: var(--space-3); flex-wrap: wrap; }
        .hero-title-row h1 { font-size: var(--fs-2xl); font-weight: 700; margin: 0; }
        .tag-badge {
          display: inline-flex; align-items: center; gap: 4px;
          padding: 2px 10px; border-radius: var(--radius-full);
          font-size: 11px; font-weight: 600;
        }
        .cf-tag { background: rgba(59, 130, 246, 0.15); color: #93C5FD; border: 1px solid rgba(59, 130, 246, 0.3); }
        .cg-tag { background: rgba(16, 185, 129, 0.15); color: #6EE7B7; border: 1px solid rgba(16, 185, 129, 0.3); }
        .hero-subtitle { color: var(--text-secondary); font-size: var(--fs-sm); margin: 4px 0 8px 0; }
        .hero-subtitle code { color: #A78BFA; background: rgba(255,255,255,0.06); padding: 1px 6px; border-radius: 4px; }
        .hero-quick-chips { display: flex; gap: var(--space-2); flex-wrap: wrap; }
        .chip {
          display: inline-flex; align-items: center; gap: 4px;
          font-size: 11px; color: var(--text-muted);
          background: rgba(255,255,255,0.04); padding: 2px 8px; border-radius: 6px;
        }
        .hero-actions-cluster { display: flex; gap: var(--space-3); flex-wrap: wrap; }
        .btn-glow { box-shadow: 0 0 20px rgba(59, 130, 246, 0.4); }
        .btn-cg-glow {
          background: linear-gradient(135deg, #10B981 0%, #059669 100%);
          color: white; border: none; box-shadow: 0 0 20px rgba(16, 185, 129, 0.4);
        }
        .btn-cg-glow:hover { background: linear-gradient(135deg, #059669 0%, #047857 100%); }

        /* ── Metrics Grid ── */
        .metrics-grid {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(220px, 1fr));
          gap: var(--space-4);
          margin-bottom: var(--space-8);
        }
        .metric-card {
          padding: var(--space-5);
          display: flex;
          align-items: center;
          gap: var(--space-4);
          border-radius: var(--radius-xl);
          background: rgba(255,255,255,0.02);
        }
        .metric-icon-wrap {
          width: 50px; height: 50px; border-radius: var(--radius-lg);
          display: flex; align-items: center; justify-content: center;
          flex-shrink: 0;
        }
        .metric-icon-wrap.blue { background: rgba(59, 130, 246, 0.12); color: #60A5FA; }
        .metric-icon-wrap.purple { background: rgba(139, 92, 246, 0.12); color: #A78BFA; }
        .metric-icon-wrap.green { background: rgba(16, 185, 129, 0.12); color: #34D399; }
        .metric-icon-wrap.emerald { background: rgba(5, 150, 105, 0.15); color: #10B981; }
        .metric-icon-wrap.violet { background: rgba(124, 58, 237, 0.15); color: #C084FC; }
        .metric-icon-wrap.amber { background: rgba(245, 158, 11, 0.12); color: #FBBF24; }
        .metric-details { display: flex; flex-direction: column; gap: 2px; }
        .metric-label { font-size: 12px; color: var(--text-muted); font-weight: 500; }
        .metric-value-row { display: flex; align-items: center; gap: var(--space-2); flex-wrap: wrap; }
        .metric-number { font-size: var(--fs-xl); font-weight: 700; color: var(--text-primary); }
        .metric-badge {
          font-size: 10px; font-weight: 700; padding: 1px 6px; border-radius: 4px;
        }
        .metric-badge.green { background: rgba(16, 185, 129, 0.15); color: #34D399; }
        .metric-badge.purple { background: rgba(139, 92, 246, 0.15); color: #C084FC; }
        .metric-badge.teal { background: rgba(20, 184, 166, 0.15); color: #2DD4BF; }

        /* ── Section Headers ── */
        .dash-section { margin-bottom: var(--space-8); }
        .section-header {
          display: flex; justify-content: space-between; align-items: center;
          margin-bottom: var(--space-4); flex-wrap: wrap; gap: var(--space-2);
        }
        .section-header h2 { font-size: var(--fs-lg); display: flex; align-items: center; gap: var(--space-2); margin: 0; }
        .section-pill {
          font-size: 11px; font-weight: 600; padding: 3px 10px; border-radius: var(--radius-full);
          background: rgba(255,255,255,0.05); color: var(--text-muted); border: 1px solid var(--border-glass);
        }
        .section-pill.red { background: rgba(239, 68, 68, 0.12); color: #F87171; border-color: rgba(239, 68, 68, 0.3); }
        .section-header-with-tabs {
          display: flex; justify-content: space-between; align-items: flex-end;
          margin-bottom: var(--space-4); flex-wrap: wrap; gap: var(--space-3);
        }
        .section-header-with-tabs h2 { font-size: var(--fs-lg); display: flex; align-items: center; gap: var(--space-2); margin: 0; }
        .section-sub { font-size: var(--fs-xs); color: var(--text-muted); margin: 2px 0 0 0; }
        .filter-tabs { display: flex; gap: var(--space-1); background: rgba(0,0,0,0.3); padding: 3px; border-radius: var(--radius-lg); }
        .filter-tab {
          padding: 5px 12px; font-size: 12px; font-weight: 600; border-radius: var(--radius-md);
          background: none; border: none; color: var(--text-secondary); cursor: pointer;
        }
        .filter-tab.active { background: rgba(255,255,255,0.1); color: var(--text-primary); }

        /* ── Care Finder: Active Shift Card ── */
        .active-shift-card {
          padding: var(--space-6);
          border-radius: var(--radius-xl);
          border: 1px solid rgba(59, 130, 246, 0.3);
          background: linear-gradient(135deg, rgba(30, 58, 138, 0.15) 0%, rgba(15, 23, 42, 0.4) 100%);
          display: grid;
          grid-template-columns: 1.2fr 1fr;
          gap: var(--space-6);
          margin-bottom: var(--space-8);
        }
        .shift-left { display: flex; gap: var(--space-4); align-items: flex-start; }
        .shift-avatar { position: relative; width: 68px; height: 68px; border-radius: var(--radius-full); flex-shrink: 0; }
        .shift-avatar img { width: 100%; height: 100%; border-radius: var(--radius-full); object-fit: cover; border: 2px solid #3B82F6; }
        .shift-live-dot {
          position: absolute; top: 0; right: 0; width: 14px; height: 14px;
          border-radius: 50%; background: #10B981; border: 2px solid #0F172A;
          box-shadow: 0 0 8px #10B981;
        }
        .shift-title-row { display: flex; align-items: center; gap: var(--space-2); flex-wrap: wrap; }
        .shift-title-row h3 { font-size: var(--fs-base); margin: 0; }
        .domain-pill { font-size: 10px; font-weight: 700; padding: 2px 8px; border-radius: var(--radius-full); }
        .domain-pill.child { background: rgba(59, 130, 246, 0.15); color: #60A5FA; }
        .badge-verified { font-size: 10px; color: #34D399; display: flex; align-items: center; gap: 3px; font-weight: 600; }
        .shift-desc { font-size: var(--fs-xs); color: var(--text-secondary); margin: 4px 0 8px 0; }
        .shift-meta-pills { display: flex; gap: var(--space-3); font-size: 12px; color: var(--text-muted); flex-wrap: wrap; }
        .shift-meta-pills span { display: flex; align-items: center; gap: 4px; }
        .shift-right { display: flex; flex-direction: column; justify-content: space-between; gap: var(--space-3); }
        .lock-focus-box {
          background: rgba(16, 185, 129, 0.08); border: 1px solid rgba(16, 185, 129, 0.2);
          border-radius: var(--radius-lg); padding: var(--space-3);
        }
        .lock-header { display: flex; align-items: center; gap: 6px; font-size: 11px; color: #34D399; margin-bottom: 2px; }
        .lock-focus-box p { font-size: 11px; color: var(--text-secondary); margin: 0 0 8px 0; }
        .lock-progress-bar { height: 4px; background: rgba(255,255,255,0.08); border-radius: 4px; overflow: hidden; }
        .lock-fill { height: 100%; background: #10B981; }
        .shift-actions { display: flex; gap: var(--space-2); }

        /* ── Bookings Grid ── */
        .bookings-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(340px, 1fr)); gap: var(--space-4); }
        .booking-card {
          padding: var(--space-5);
          display: flex;
          flex-direction: column;
          gap: var(--space-3);
          border-radius: var(--radius-xl);
          transition: transform 0.2s ease, border-color 0.2s ease;
        }
        .booking-card:hover { transform: translateY(-2px); border-color: rgba(139, 92, 246, 0.4); }
        .booking-card.past { opacity: 0.85; }
        .booking-card.active-card { border-color: rgba(59, 130, 246, 0.4); }
        .booking-top { display: flex; align-items: center; gap: var(--space-3); }
        .booking-avatar-img { width: 50px; height: 50px; border-radius: var(--radius-full); overflow: hidden; flex-shrink: 0; }
        .booking-avatar-img img { width: 100%; height: 100%; object-fit: cover; }
        .booking-info { flex: 1; }
        .booking-info h4 { font-size: var(--fs-base); margin: 0 0 2px 0; }
        .booking-domain { font-size: 11px; color: #93C5FD; display: block; }
        .booking-id { font-size: 10px; color: var(--text-muted); font-family: monospace; }
        .badge-trust { background: rgba(16, 185, 129, 0.15); color: #34D399; font-size: 10px; font-weight: 700; padding: 2px 8px; border-radius: var(--radius-full); }
        .badge-completed { background: rgba(255, 255, 255, 0.08); color: var(--text-secondary); font-size: 10px; font-weight: 600; padding: 2px 8px; border-radius: var(--radius-full); }
        .booking-details-box {
          background: rgba(0,0,0,0.25); border-radius: var(--radius-md);
          padding: var(--space-3); display: flex; flex-direction: column; gap: 4px;
        }
        .detail-item { display: flex; align-items: center; gap: 6px; font-size: 12px; color: var(--text-secondary); }
        .detail-item svg { color: var(--text-muted); }
        .booking-actions { display: flex; gap: var(--space-2); flex-wrap: wrap; margin-top: auto; }
        .rated-badge {
          display: inline-flex; align-items: center; gap: 4px;
          font-size: 11px; color: #34D399; font-weight: 600;
          padding: var(--space-1) var(--space-2);
        }

        /* ── Favorites Grid ── */
        .favorites-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(280px, 1fr)); gap: var(--space-4); }
        .fav-card { padding: var(--space-4); display: flex; flex-direction: column; gap: var(--space-3); border-radius: var(--radius-xl); }
        .fav-top { display: flex; gap: var(--space-3); align-items: center; }
        .fav-avatar { width: 48px; height: 48px; border-radius: var(--radius-full); object-fit: cover; }
        .fav-info h4 { font-size: var(--fs-sm); margin: 0 0 2px 0; }
        .fav-category { font-size: 11px; color: var(--text-tertiary); display: block; }
        .fav-score { font-size: 11px; color: var(--text-secondary); display: flex; align-items: center; gap: 3px; }
        .fav-tags { display: flex; gap: 4px; flex-wrap: wrap; }
        .spec-tag { font-size: 10px; background: rgba(255,255,255,0.06); padding: 2px 6px; border-radius: 4px; color: var(--text-muted); }
        .fav-actions { display: flex; gap: var(--space-2); margin-top: auto; }

        /* ── Safety Profile ── */
        .safety-card { padding: var(--space-6); border-radius: var(--radius-xl); }
        .safety-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: var(--space-4); }
        .safety-item { display: flex; flex-direction: column; gap: 4px; }
        .safety-item.full { grid-column: 1 / -1; }
        .safety-label { font-size: 11px; color: var(--text-muted); text-transform: uppercase; letter-spacing: 0.5px; font-weight: 600; }
        .safety-value { font-size: var(--fs-sm); color: var(--text-primary); }
        .safety-hint { font-size: 11px; color: var(--text-muted); align-self: center; }
        .safety-form-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(220px, 1fr)); gap: var(--space-3); }
        .form-group { display: flex; flex-direction: column; gap: 4px; }
        .form-group.full { grid-column: 1 / -1; }
        .form-group label { font-size: 11px; color: var(--text-muted); }

        /* ── Caregiver Live Duty Status Bar ── */
        .cg-live-status-card {
          display: flex; justify-content: space-between; align-items: center;
          padding: var(--space-4) var(--space-6); border-radius: var(--radius-xl);
          background: rgba(15, 13, 26, 0.7); border: 1px solid rgba(16, 185, 129, 0.3);
          gap: var(--space-4); flex-wrap: wrap; margin-bottom: var(--space-6);
        }
        .status-indicator-side { display: flex; align-items: center; gap: var(--space-3); }
        .status-beacon {
          width: 14px; height: 14px; border-radius: 50%; flex-shrink: 0;
          box-shadow: 0 0 12px currentColor;
        }
        .status-beacon.available { background: #10B981; color: #10B981; }
        .status-beacon.duty { background: #EF4444; color: #EF4444; }
        .status-beacon.scheduled { background: #F59E0B; color: #F59E0B; }
        .status-beacon.offline { background: #64748B; color: #64748B; }
        .status-indicator-side strong { font-size: 13px; color: var(--text-primary); display: block; }
        .status-indicator-side p { font-size: 11px; color: var(--text-muted); margin: 0; }
        .status-selector-buttons { display: flex; gap: var(--space-2); flex-wrap: wrap; }
        .status-btn {
          padding: 6px 14px; border-radius: var(--radius-md);
          font-size: 11px; font-weight: 600; cursor: pointer;
          background: rgba(255,255,255,0.04); border: 1px solid var(--border-glass);
          color: var(--text-secondary); transition: all 0.2s;
        }
        .status-btn:hover { background: rgba(255,255,255,0.08); color: var(--text-primary); }
        .status-btn.active-avail { background: rgba(16, 185, 129, 0.15); border-color: #10B981; color: #34D399; }
        .status-btn.active-duty { background: rgba(239, 68, 68, 0.15); border-color: #EF4444; color: #F87171; }
        .status-btn.active-sched { background: rgba(245, 158, 11, 0.15); border-color: #F59E0B; color: #FBBF24; }
        .status-btn.active-off { background: rgba(100, 116, 139, 0.2); border-color: #64748B; color: #CBD5E1; }

        /* ── Caregiver Active Shift Card ── */
        .cg-active-shift-card {
          padding: var(--space-6); border-radius: var(--radius-xl);
          border: 1px solid rgba(239, 68, 68, 0.4);
          background: linear-gradient(135deg, rgba(127, 29, 29, 0.15) 0%, rgba(15, 23, 42, 0.5) 100%);
          display: flex; flex-direction: column; gap: var(--space-4);
          margin-bottom: var(--space-8);
        }
        .active-shift-top { display: flex; gap: var(--space-4); align-items: center; justify-content: space-between; flex-wrap: wrap; }
        .patient-avatar-box { width: 64px; height: 64px; border-radius: var(--radius-full); overflow: hidden; flex-shrink: 0; border: 2px solid #F59E0B; }
        .patient-avatar-box img { width: 100%; height: 100%; object-fit: cover; }
        .active-patient-meta { flex: 1; min-width: 260px; }
        .active-patient-meta h3 { font-size: var(--fs-base); margin: 0 0 2px 0; }
        .pt-id { font-size: 11px; color: var(--text-muted); font-family: monospace; font-weight: normal; }
        .care-needs-desc { font-size: 12px; color: var(--text-secondary); margin: 2px 0 6px 0; }
        .active-pills-row { display: flex; gap: var(--space-3); font-size: 12px; color: var(--text-muted); flex-wrap: wrap; }
        .active-pills-row span { display: flex; align-items: center; gap: 4px; }
        .active-timer-box {
          background: rgba(239, 68, 68, 0.1); border: 1px solid rgba(239, 68, 68, 0.3);
          border-radius: var(--radius-lg); padding: var(--space-3) var(--space-4);
          display: flex; flex-direction: column; align-items: center; text-align: center;
        }
        .timer-title { font-size: 10px; color: #F87171; font-weight: 700; text-transform: uppercase; }
        .timer-val { font-size: 15px; font-weight: 800; color: #fff; margin: 2px 0; }
        .timer-sub { font-size: 10px; color: var(--text-muted); }
        .active-shift-bottom {
          display: flex; justify-content: space-between; align-items: center;
          padding-top: var(--space-3); border-top: 1px solid var(--border-glass);
          flex-wrap: wrap; gap: var(--space-3);
        }
        .safety-reminder { display: flex; align-items: center; gap: 6px; font-size: 12px; color: #94A3B8; }
        .btn-complete {
          background: linear-gradient(135deg, #10B981 0%, #059669 100%);
          border: none; color: #fff; font-weight: 600; padding: var(--space-2) var(--space-4);
        }

        /* ── Incoming Requests Grid ── */
        .requests-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(320px, 1fr)); gap: var(--space-4); }
        .request-card {
          padding: var(--space-5); border-radius: var(--radius-xl);
          display: flex; flex-direction: column; gap: var(--space-3);
          border: 1px solid rgba(16, 185, 129, 0.25);
          background: rgba(16, 185, 129, 0.03);
        }
        .req-header { display: flex; align-items: center; gap: var(--space-3); }
        .req-avatar { width: 44px; height: 44px; border-radius: var(--radius-full); overflow: hidden; flex-shrink: 0; }
        .req-avatar img { width: 100%; height: 100%; object-fit: cover; }
        .req-info { flex: 1; }
        .req-info h4 { font-size: var(--fs-sm); margin: 0 0 2px 0; }
        .req-cat { font-size: 11px; color: var(--text-muted); }
        .req-payout { font-size: var(--fs-lg); font-weight: 800; color: #10B981; }
        .req-desc { font-size: 12px; color: var(--text-secondary); margin: 0; }
        .req-meta { display: flex; flex-direction: column; gap: 3px; font-size: 11px; color: var(--text-muted); }
        .req-meta span { display: flex; align-items: center; gap: 4px; }
        .req-actions { display: flex; gap: var(--space-2); margin-top: auto; }
        .btn-accept { flex: 1; background: #10B981; border: none; }
        .btn-accept:hover { background: #059669; }
        .btn-decline { color: #F87171; }
        .empty-requests {
          padding: var(--space-8); display: flex; flex-direction: column; align-items: center;
          gap: var(--space-3); text-align: center; color: var(--text-muted);
        }

        /* ── Earnings & Financial Hub ── */
        .earnings-analytics-card { padding: var(--space-6); border-radius: var(--radius-xl); }
        .earnings-split {
          display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
          gap: var(--space-4); margin-bottom: var(--space-6);
        }
        .earn-box {
          background: rgba(255,255,255,0.02); border: 1px solid var(--border-glass);
          border-radius: var(--radius-lg); padding: var(--space-4);
          display: flex; flex-direction: column; gap: 4px;
        }
        .earn-box.highlight {
          background: rgba(16, 185, 129, 0.08); border-color: rgba(16, 185, 129, 0.3);
        }
        .earn-label { font-size: 11px; color: var(--text-muted); font-weight: 600; text-transform: uppercase; }
        .earn-val { font-size: var(--fs-2xl); font-weight: 800; }
        .earn-val.green { color: #10B981; }
        .earn-sub { font-size: 11px; color: var(--text-secondary); }
        .payout-action-row {
          display: flex; justify-content: space-between; align-items: center;
          padding-top: var(--space-4); border-top: 1px solid var(--border-glass);
          flex-wrap: wrap; gap: var(--space-3);
        }
        .payout-method-info { display: flex; align-items: center; gap: var(--space-3); }
        .payout-icon { font-size: 24px; }
        .payout-method-info strong { font-size: 13px; display: block; }
        .payout-method-info p { font-size: 11px; color: var(--text-muted); margin: 0; }
        .btn-payout { background: linear-gradient(135deg, #10B981 0%, #059669 100%); border: none; font-weight: 600; }

        /* ── Skill Pathway ── */
        .pathway-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(240px, 1fr)); gap: var(--space-4); }
        .pathway-card {
          padding: var(--space-5); border-radius: var(--radius-xl);
          display: flex; flex-direction: column; gap: var(--space-2);
        }
        .path-top { display: flex; gap: var(--space-3); align-items: flex-start; }
        .path-icon { font-size: 20px; flex-shrink: 0; }
        .path-top h4 { font-size: var(--fs-sm); margin: 0 0 2px 0; }
        .path-top p { font-size: 11px; color: var(--text-muted); margin: 0; }
        .path-status { font-size: 11px; font-weight: 700; margin-top: auto; }
        .path-status.verified { color: #10B981; }
        .path-status.progress { color: #F59E0B; }
        .path-progress-bar { height: 6px; background: rgba(255,255,255,0.06); border-radius: 99px; overflow: hidden; }
        .path-progress-fill { height: 100%; background: #F59E0B; }

        /* ── Completed Jobs Feed ── */
        .completed-jobs-list { display: flex; flex-direction: column; gap: var(--space-3); }
        .completed-job-item { padding: var(--space-4) var(--space-5); border-radius: var(--radius-lg); }
        .cj-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 6px; }
        .cj-user { display: flex; align-items: center; gap: var(--space-3); }
        .cj-user img { width: 36px; height: 36px; border-radius: var(--radius-full); }
        .cj-meta { font-size: 11px; color: var(--text-muted); display: block; }
        .cj-payout-rating { display: flex; align-items: center; gap: var(--space-3); }
        .cj-earn { font-size: var(--fs-sm); font-weight: 700; color: #10B981; }
        .cj-stars { font-size: 12px; color: #F59E0B; font-weight: 600; display: flex; align-items: center; gap: 3px; }
        .cj-comment { font-size: 12px; color: var(--text-secondary); margin: 0; font-style: italic; }

        /* ── Notifications ── */
        .notif-list { display: flex; flex-direction: column; gap: var(--space-3); }
        .notif-item { display: flex; gap: var(--space-3); padding: var(--space-4); align-items: flex-start; border-radius: var(--radius-lg); }
        .notif-icon { font-size: 20px; flex-shrink: 0; }
        .notif-content { flex: 1; }
        .notif-content strong { font-size: var(--fs-sm); display: block; margin-bottom: 2px; }
        .notif-content p { font-size: 12px; color: var(--text-secondary); margin: 0; }
        .notif-time { font-size: 10px; color: var(--text-muted); margin-top: 4px; display: inline-block; }

        /* ── Modals General ── */
        .modal-overlay {
          position: fixed; inset: 0; background: rgba(0,0,0,0.8);
          backdrop-filter: blur(8px); display: flex; align-items: center; justify-content: center;
          z-index: 9999; padding: 16px;
        }
        .modal-close-btn {
          background: rgba(255,255,255,0.06); border: none; color: #fff;
          width: 30px; height: 30px; border-radius: 50%; display: flex;
          align-items: center; justify-content: center; cursor: pointer;
        }
        .modal-close-btn:hover { background: rgba(255,255,255,0.15); }
        .modal-header-simple { display: flex; justify-content: space-between; align-items: center; margin-bottom: var(--space-4); }
        .modal-header-simple h3 { font-size: var(--fs-base); display: flex; align-items: center; gap: var(--space-2); margin: 0; }

        /* ── Safety Pass Card ── */
        .safety-pass-card {
          max-width: 500px; width: 100%; border-radius: 20px;
          border: 1px solid rgba(139, 92, 246, 0.3); background: #12101E;
          padding: 24px; box-shadow: 0 25px 80px rgba(0,0,0,0.6);
        }
        .pass-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 18px; }
        .pass-title { display: flex; align-items: center; gap: 8px; font-weight: 800; font-size: 13px; color: #A78BFA; }
        .pass-caregiver-row { display: flex; gap: 14px; align-items: center; padding-bottom: 16px; border-bottom: 1px solid var(--border-glass); }
        .pass-avatar { width: 64px; height: 64px; border-radius: 50%; object-fit: cover; border: 2px solid #10B981; }
        .pass-cg-details h3 { font-size: 17px; margin-bottom: 2px; }
        .pass-domain-tag { font-size: 11px; color: #34D399; font-weight: 600; }
        .pass-ids { display: flex; gap: 12px; font-size: 11px; color: #94A3B8; margin-top: 4px; font-family: monospace; }
        .pass-guarantees { display: flex; flex-direction: column; gap: 8px; margin: 16px 0; }
        .pass-guarantee-item { display: flex; gap: 10px; align-items: flex-start; background: rgba(255,255,255,0.03); border: 1px solid rgba(255,255,255,0.06); border-radius: 10px; padding: 8px 12px; }
        .guarantee-icon { font-size: 16px; flex-shrink: 0; margin-top: 2px; }
        .pass-guarantee-item strong { font-size: 12px; color: #E2E8F0; display: block; }
        .pass-guarantee-item p { font-size: 11px; color: #94A3B8; margin: 0; }
        .pass-qr-section { display: flex; gap: 14px; align-items: center; background: rgba(139, 92, 246, 0.08); border: 1px dashed rgba(139, 92, 246, 0.3); border-radius: 12px; padding: 12px; margin-bottom: 16px; }
        .pass-qr-box { display: flex; flex-direction: column; align-items: center; gap: 4px; }
        .pass-qr-box span { font-size: 8px; color: #A78BFA; font-weight: 700; text-align: center; }
        .pass-qr-text strong { font-size: 11px; color: #E2E8F0; display: block; }
        .pass-qr-text code { font-size: 10px; color: #A78BFA; font-family: monospace; display: block; margin: 2px 0 4px 0; }
        .pass-qr-text p { font-size: 11px; color: #94A3B8; margin: 0; }

        /* ── ID Card Modal ── */
        .id-card-modal {
          max-width: 440px; width: 100%; border-radius: 20px;
          border: 1px solid rgba(16, 185, 129, 0.4); background: #0c1815;
          padding: 24px; box-shadow: 0 25px 80px rgba(0,0,0,0.7);
        }
        .id-card-header { display: flex; justify-content: space-between; align-items: center; font-size: 12px; font-weight: 800; color: #10B981; margin-bottom: 16px; }
        .id-card-body { display: flex; gap: 16px; align-items: center; padding-bottom: 16px; border-bottom: 1px solid var(--border-glass); }
        .id-card-photo-box { width: 90px; height: 90px; border-radius: 12px; overflow: hidden; position: relative; flex-shrink: 0; }
        .id-card-photo-box img { width: 100%; height: 100%; object-fit: cover; }
        .id-verified-seal { position: absolute; bottom: 0; left: 0; right: 0; background: #10B981; color: #000; font-size: 8px; font-weight: 800; text-align: center; padding: 2px 0; }
        .id-card-details h2 { font-size: var(--fs-lg); margin: 0 0 2px 0; }
        .id-role { font-size: 11px; color: #34D399; font-weight: 600; }
        .id-meta-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 6px; margin-top: 8px; font-size: 11px; }
        .id-meta-grid span { color: var(--text-muted); display: block; }
        .id-meta-grid strong { color: #fff; font-family: monospace; }
        .id-card-qr-footer { display: flex; align-items: center; gap: 12px; margin-top: 16px; }

        /* ── Payout Modal ── */
        .payout-modal, .cert-modal {
          max-width: 440px; width: 100%; border-radius: 20px;
          border: 1px solid var(--border-glass); background: #12101E;
          padding: 24px; box-shadow: 0 25px 80px rgba(0,0,0,0.6);
        }
        .payout-amount-card {
          text-align: center; background: rgba(16, 185, 129, 0.08);
          border: 1px solid rgba(16, 185, 129, 0.2); border-radius: var(--radius-lg);
          padding: var(--space-4); margin-bottom: var(--space-4);
        }
        .payout-amount-card span { font-size: 11px; color: var(--text-muted); }
        .payout-amount-card h2 { font-size: var(--fs-3xl); color: #10B981; margin: 4px 0; }
        .payout-free { font-size: 11px; color: #34D399; font-weight: 600; }
        .payout-destination label { font-size: 11px; color: var(--text-muted); margin-bottom: 6px; display: block; }
        .dest-option {
          display: flex; justify-content: space-between; align-items: center;
          padding: 10px 12px; border-radius: var(--radius-md);
          background: rgba(255,255,255,0.03); border: 1px solid var(--border-glass);
          margin-bottom: 8px; font-size: 12px;
        }
        .dest-option.selected { border-color: #10B981; background: rgba(16, 185, 129, 0.06); }
        .payout-success-box {
          background: rgba(16, 185, 129, 0.12); border: 1px solid #10B981;
          border-radius: var(--radius-md); padding: 12px; margin-top: 14px;
          display: flex; align-items: center; gap: 10px; color: #34D399; font-size: 12px;
        }
        .upload-dropzone {
          border: 2px dashed rgba(139, 92, 246, 0.4); border-radius: var(--radius-lg);
          padding: var(--space-6); display: flex; flex-direction: column; align-items: center;
          gap: 6px; text-align: center; cursor: pointer; transition: all 0.2s;
          background: rgba(139, 92, 246, 0.05); margin-top: 12px;
        }
        .upload-dropzone:hover { border-color: #A78BFA; background: rgba(139, 92, 246, 0.1); }
        .upload-dropzone strong { font-size: 13px; color: #E2E8F0; }
        .upload-dropzone span { font-size: 11px; color: #94A3B8; }

        @media (max-width: 768px) {
          .active-shift-card { grid-template-columns: 1fr; }
          .dash-hero-card { flex-direction: column; align-items: flex-start; }
          .hero-actions-cluster { width: 100%; }
          .hero-actions-cluster button { flex: 1; }
          .cg-live-status-card { flex-direction: column; align-items: flex-start; }
          .status-selector-buttons { width: 100%; }
        }
      `}</style>
    </div>
  );
}

import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { useAuth } from '../stores/auth.store';
import {
  Activity,
  Phone,
  Building2,
  Stethoscope,
  Zap,
  ShieldCheck,
  Award,
  Clock,
  MapPin,
  Mail,
  Send,
  Star,
  ArrowRight,
  X,
  Users,
  CheckCircle2,
  Menu,
} from 'lucide-react';
import { UserRole } from '../../../shared/src/types';

const DEMO_ACCOUNTS: { role: UserRole; name: string }[] = [
  { role: 'ADMINISTRATOR', name: 'Dr. Sarah Jenkins' },
  { role: 'OT_MANAGER', name: 'Marcus Vance, RN' },
  { role: 'CSSD_STAFF', name: 'Elena Rostova' },
  { role: 'WARD_STAFF', name: 'Nurse David Chen' },
];

export const LoginPage: React.FC = () => {

  const { login, quickLoginAs, isLoading } = useAuth();
  const [showLoginModal, setShowLoginModal] = useState(false);
  const [email, setEmail] = useState('admin@smartot.hospital');
  const [password, setPassword] = useState('Admin@123password');
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'home' | 'about' | 'contact'>('home');
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [formData, setFormData] = useState({ name: '', email: '', subject: '', message: '' });
  const [displayRating, setDisplayRating] = useState(0);
  const [displayReviews, setDisplayReviews] = useState(0);

  // On every page load / refresh → always start at the top (Home section)
  useEffect(() => {
    window.scrollTo({ top: 0, left: 0, behavior: 'instant' });
    setActiveTab('home');
  }, []);

  useEffect(() => {
    let start: number | null = null;
    const animate = (timestamp: number) => {
      if (!start) start = timestamp;
      const progress = Math.min((timestamp - start) / 1200, 1);
      setDisplayRating(parseFloat((4.8 * progress).toFixed(1)));
      setDisplayReviews(Math.floor(1224 * progress));
      if (progress < 1) requestAnimationFrame(animate);
    };
    requestAnimationFrame(animate);
  }, []);

  // Auto-highlight nav tab as user scrolls with mouse
  useEffect(() => {
    const sections: Array<'home' | 'about' | 'contact'> = ['home', 'about', 'contact'];
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            setActiveTab(entry.target.id as 'home' | 'about' | 'contact');
          }
        });
      },
      { threshold: 0.3, rootMargin: '-64px 0px 0px 0px' }
    );
    sections.forEach((id) => {
      const el = document.getElementById(id);
      if (el) observer.observe(el);
    });
    return () => observer.disconnect();
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    try {
      await login(email, password);
    } catch (err: any) {
      setError(err.message || 'Login failed');
    }
  };

  const handleQuickLogin = async (role: UserRole) => {
    setError(null);
    try {
      await quickLoginAs(role);
    } catch (err: any) {
      setError(err.message || 'Login failed');
    }
  };

  const openPortalModal = () => {
    setShowLoginModal(true);
    setIsMenuOpen(false);
  };

  const handleFormChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleFormSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    alert('Thank you for your message! We will get back to you soon.');
    setFormData({ name: '', email: '', subject: '', message: '' });
  };

  const scrollToSection = (section: 'home' | 'about' | 'contact') => {
    setActiveTab(section);
    setIsMenuOpen(false);
    const el = document.getElementById(section);
    if (el) el.scrollIntoView({ behavior: 'smooth' });
  };

  const testimonials = [
    {
      name: 'Dr. Priya Sharma',
      rating: 5,
      comment: 'SmartOT Command reduced our OT delay rates by 40%. The AI delay-risk alerts are incredibly accurate.',
      image: 'https://images.pexels.com/photos/1036623/pexels-photo-1036623.jpeg?auto=compress&cs=tinysrgb&w=200',
    },
    {
      name: 'Mr. Ravi Kumar (OT Manager)',
      rating: 5,
      comment: 'Real-time CSSD tracking with QR scanning eliminated misplaced surgical packs. A game changer!',
      image: 'https://images.pexels.com/photos/1222271/pexels-photo-1222271.jpeg?auto=compress&cs=tinysrgb&w=200',
    },
    {
      name: 'Nurse Anita Menon',
      rating: 4,
      comment: 'The patient readiness checklist ensures every patient is fully prepared before entering the OT.',
      image: 'https://images.pexels.com/photos/415829/pexels-photo-415829.jpeg?auto=compress&cs=tinysrgb&w=200',
    },
    {
      name: 'Dr. Suresh Nair (Surgeon)',
      rating: 5,
      comment: 'The AI consultant gives me bottleneck analysis on demand. No more guessing what caused delays.',
      image: 'https://images.pexels.com/photos/614810/pexels-photo-614810.jpeg?auto=compress&cs=tinysrgb&w=200',
    },
  ];

  const awards = [
    'Best Hospital Tech 2024',
    'ISO 9001 Certified Platform',
    'AI Innovation Award',
    'Patient Safety Excellence',
  ];

  return (
    <div className="min-h-screen bg-gray-50 text-slate-800 font-sans scroll-smooth">

      {/* â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â• NAVBAR â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â• */}
      <nav className="bg-teal-700 shadow-md sticky top-0 z-50 text-white transition-all">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <button
              onClick={() => scrollToSection('home')}
              className="flex items-center space-x-2.5 hover:opacity-90 transition-opacity focus:outline-none"
            >
              <div className="bg-white p-1.5 rounded-lg shadow-sm flex items-center justify-center">
                <Activity className="h-6 w-6 text-teal-700" />
              </div>
              <span className="text-2xl font-extrabold tracking-tight text-white font-sans">
                SmartOT <span className="text-teal-200">Command</span>
              </span>
            </button>

            <div className="hidden md:flex items-center space-x-6">
              {(['home', 'about', 'contact'] as const).map((tab) => (
                <button
                  key={tab}
                  onClick={() => scrollToSection(tab)}
                  className={`font-medium transition-colors ${
                    activeTab === tab ? 'text-white border-b-2 border-white pb-0.5' : 'text-teal-100 hover:text-white'
                  }`}
                >
                  {tab === 'about' ? 'About Us' : tab.charAt(0).toUpperCase() + tab.slice(1)}
                </button>
              ))}
              <div className="flex items-center space-x-3 pl-2">
                <button onClick={openPortalModal} className="bg-white/10 hover:bg-white/20 text-white font-medium px-4 py-2 rounded-lg transition-all text-sm">
                  Staff Portal
                </button>
                <button onClick={openPortalModal} className="bg-white text-teal-800 hover:bg-teal-50 font-semibold px-4 py-2 rounded-lg transition-all text-sm shadow-sm">
                  OT Manager Login
                </button>
              </div>
              <a href="tel:9840635391" className="flex items-center space-x-1.5 bg-red-500 hover:bg-red-600 text-white px-3.5 py-2 rounded-lg text-sm font-semibold transition-all shadow-sm">
                <Phone className="h-4 w-4" /><span>Emergency</span>
              </a>
            </div>

            <button className="md:hidden p-2 rounded-lg text-white hover:bg-teal-600 focus:outline-none" onClick={() => setIsMenuOpen(!isMenuOpen)}>
              {isMenuOpen ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
            </button>
          </div>
        </div>
      </nav>

      {/* Mobile dropdown overlay — renders BELOW the navbar, nav bar itself never collapses */}
      {isMenuOpen && (
        <div className="md:hidden fixed top-16 left-0 right-0 z-40 bg-teal-700 shadow-xl border-t border-teal-500 py-4 px-4 space-y-3 animate-slideDown">
          {(['home', 'about', 'contact'] as const).map((tab) => (
            <button
              key={tab}
              onClick={() => scrollToSection(tab)}
              className={`block w-full text-left font-medium px-3 py-2.5 rounded-lg transition-all ${
                activeTab === tab ? 'bg-white/20 text-white font-bold' : 'text-teal-100 hover:bg-teal-600 hover:text-white'
              }`}
            >
              {tab === 'about' ? 'About Us' : tab.charAt(0).toUpperCase() + tab.slice(1)}
            </button>
          ))}
          <div className="pt-2 flex flex-col space-y-2 border-t border-teal-500">
            <button onClick={openPortalModal} className="block text-center bg-white/10 hover:bg-white/20 text-white font-medium px-4 py-2.5 rounded-lg">Staff Portal</button>
            <button onClick={openPortalModal} className="block text-center bg-white text-teal-800 font-semibold px-4 py-2.5 rounded-lg">OT Manager Login</button>
          </div>
          <a href="tel:9840635391" className="flex items-center justify-center space-x-2 bg-red-500 hover:bg-red-600 text-white py-2.5 rounded-lg text-sm font-semibold transition-all">
            <Phone className="h-4 w-4" /><span>Call Emergency Hotline</span>
          </a>
        </div>
      )}

      {/* â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â• HERO SECTION â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â• */}
      <section id="home" className="relative min-h-[calc(100vh-64px)] bg-gradient-to-br from-teal-100/70 via-teal-50/40 to-white overflow-hidden flex items-center">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12 md:py-16 w-full">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-12 items-center">
            
            {/* Left Content */}
            <motion.div
              initial={{ opacity: 0, x: -40 }}
              whileInView={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.7, ease: 'easeOut' }}
              viewport={{ amount: 0.3 }}
              className="lg:col-span-6 space-y-8"
            >
              <div className="space-y-4">
                <h1 className="text-5xl sm:text-6xl lg:text-7xl font-black tracking-tight leading-[1.1]">
                  <span className="block text-black">Smart OT,</span>
                  <span className="block text-teal-600 mt-1">Zero Delays</span>
                </h1>
                <p className="text-lg sm:text-xl text-gray-600 leading-relaxed max-w-xl pt-2">
                  AI-powered hospital operating room scheduling, delay-risk analytics, and real-time surgical workflow management.
                </p>
              </div>
              <div className="flex flex-wrap items-center gap-4 pt-2">
                <button onClick={openPortalModal} className="bg-teal-600 hover:bg-teal-700 text-white font-semibold px-8 py-3.5 rounded-full shadow-lg shadow-teal-600/25 transition-all hover:scale-105 duration-200 text-center min-w-[160px]">
                  Command Portal
                </button>
                <button onClick={openPortalModal} className="border-2 border-teal-600 text-teal-600 hover:bg-teal-50 font-semibold px-8 py-3.5 rounded-full transition-all hover:scale-105 duration-200 text-center min-w-[180px]">
                  View OT Schedule
                </button>
              </div>
              
              {/* 4 Stat Cards */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 pt-6">
                {[
                  { icon: <Building2 className="h-7 w-7 text-teal-600" />, label: 'Active OTs', value: '8', bg: 'bg-teal-50' },
                  { icon: <Zap className="h-7 w-7 text-green-600" />, label: 'On-Time Starts', value: '94.8%', bg: 'bg-green-50' },
                  { icon: <Stethoscope className="h-7 w-7 text-purple-600" />, label: 'Surgeries Done', value: '1,250+', bg: 'bg-purple-50' },
                  { icon: <Star className="h-7 w-7 text-yellow-500" />, label: 'Rating', value: '4.8', bg: 'bg-yellow-50' },
                ].map((item, i) => (
                  <motion.div
                    key={i}
                    initial={{ opacity: 0, y: 20 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.5, delay: i * 0.1 }}
                    whileHover={{ scale: 1.05 }}
                    viewport={{ amount: 0.3 }}
                    className="bg-white/90 backdrop-blur-md rounded-2xl p-4 shadow-sm border border-gray-100 text-center transition-all duration-300 hover:shadow-md cursor-pointer"
                  >
                    <div className={`${item.bg} p-3 rounded-full w-14 h-14 mx-auto flex items-center justify-center mb-3`}>{item.icon}</div>
                    <p className="text-2xl font-bold text-gray-900">{item.value}</p>
                    <p className="text-gray-500 text-xs font-medium mt-0.5">{item.label}</p>
                  </motion.div>
                ))}
              </div>
            </motion.div>

            {/* Right Hero Image */}
            <motion.div
              initial={{ opacity: 0, x: 40 }}
              whileInView={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.7, ease: 'easeOut' }}
              viewport={{ amount: 0.3 }}
              className="lg:col-span-6 flex justify-center lg:justify-end"
            >
              <div className="relative w-full max-w-lg lg:max-w-none">
                <div className="rounded-[32px] overflow-hidden shadow-2xl border-4 border-white/80 transition-transform duration-500 hover:scale-[1.02]">
                  <img src="https://www.icumed.com/media/atzgwa4r/genfloor-summary-image_.jpg?format=webp" alt="Operating room" className="w-full h-[400px] sm:h-[480px] lg:h-[500px] object-cover" />
                </div>
              </div>
            </motion.div>

          </div>
        </div>
      </section>

      {/* â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â• ABOUT SECTION â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â• */}
      <section
        id="about"
        className="py-20 bg-cover bg-center bg-no-repeat relative"
        style={{ backgroundImage: "url('https://img.freepik.com/free-photo/medical-banner-with-doctor-wearing-goggles_23-2149611193.jpg?semt=ais_hybrid&w=740')" }}
      >
        <div className="absolute inset-0 bg-black/55" />

        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-20">

          {/* Heading */}
          <motion.div
            initial={{ opacity: 0, y: 35 }}
            whileInView={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
            viewport={{ amount: 0.3 }}
            className="text-center"
          >
            <h2 className="text-4xl font-bold text-white mb-4">About SmartOT Command</h2>
            <p className="text-xl text-gray-200 max-w-3xl mx-auto">Leading hospital OT operations platform with over 25 years of healthcare excellence</p>
          </motion.div>

          {/* Our History */}
          <motion.div
            initial={{ opacity: 0, y: 40 }}
            whileInView={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.7 }}
            viewport={{ amount: 0.3 }}
            className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center"
          >
            <motion.div
              whileHover={{ scale: 1.03 }}
              transition={{ duration: 0.3 }}
              className="rounded-xl shadow-2xl overflow-hidden"
            >
              <img src="https://images.pexels.com/photos/263337/pexels-photo-263337.jpeg?auto=compress&cs=tinysrgb&w=600" alt="Hospital History" className="w-full h-80 object-cover" />
            </motion.div>
            <div className="space-y-6 text-white">
              <h3 className="text-3xl font-bold">Our History</h3>
              <p className="text-gray-100 leading-relaxed">Founded in 1998, SmartOT Command has been at the forefront of surgical operations innovation. What started as a small operating room scheduling tool has grown into one of the region's most trusted hospital workflow intelligence platforms.</p>
              <p className="text-gray-100 leading-relaxed">Our commitment to excellence has earned us recognition as a Top 5 Hospital Tech Platform in South India, serving over 56,000 patients with a team of 120+ medical professionals and OT staff.</p>
              <div className="grid grid-cols-2 gap-4 pt-4">
                {[
                  { icon: <Users className="h-8 w-8 text-teal-600 mx-auto mb-2" />, value: '120+', label: 'Expert Surgeons' },
                  { icon: <Clock className="h-8 w-8 text-emerald-600 mx-auto mb-2" />, value: '25+', label: 'Years Experience' },
                ].map((item, i) => (
                  <motion.div
                    key={i}
                    whileHover={{ scale: 1.05, y: -4 }}
                    className="text-center p-4 bg-white/90 backdrop-blur-md rounded-xl shadow-md transition duration-300 border border-white/60 cursor-pointer"
                  >
                    {item.icon}
                    <p className="text-2xl font-bold text-gray-900">{item.value}</p>
                    <p className="text-gray-600 text-sm font-medium">{item.label}</p>
                  </motion.div>
                ))}
              </div>
            </div>
          </motion.div>

          {/* Platform Capabilities */}
          <motion.div
            initial={{ opacity: 0, y: 40 }}
            whileInView={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.7 }}
            viewport={{ amount: 0.2 }}
          >
            <h3 className="text-3xl font-bold text-white text-center mb-8">Platform Capabilities</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {[
                { title: 'Live OT Schedule', desc: 'Real-time visibility into all operating theatres â€” status, patient, surgeon, and delay risk.' },
                { title: 'AI Delay Risk Intelligence', desc: 'ML-powered predictions that flag high-risk surgeries before delays occur.' },
                { title: 'CSSD QR Tracking', desc: 'QR scan-based surgical pack sterilization lifecycle management and availability checks.' },
                { title: 'Patient Readiness Checklist', desc: 'Digital pre-operative consent, documentation, and preparation status dashboard.' },
                { title: 'What-If Simulator', desc: 'Model the impact of workflow changes on OT utilization and surgery throughput.' },
                { title: 'AI Operations Consultant', desc: 'On-demand AI assistant that analyses bottlenecks and recommends next best actions.' },
              ].map((cap, i) => (
                <motion.div
                  key={i}
                  initial={{ opacity: 0, y: 30 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.5, delay: i * 0.08 }}
                  whileHover={{ scale: 1.04, y: -5 }}
                  viewport={{ amount: 0.2 }}
                  className="bg-white/90 backdrop-blur-md rounded-xl p-6 shadow-lg border border-white/40 cursor-pointer"
                >
                  <CheckCircle2 className="h-8 w-8 text-teal-600 mb-3" />
                  <h4 className="font-bold text-gray-900 text-lg mb-2">{cap.title}</h4>
                  <p className="text-gray-600 text-sm leading-relaxed">{cap.desc}</p>
                </motion.div>
              ))}
            </div>
          </motion.div>

          {/* Awards & Certifications */}
          <motion.div
            initial={{ opacity: 0, y: 40 }}
            whileInView={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.7 }}
            viewport={{ amount: 0.2 }}
          >
            <h3 className="text-3xl font-bold text-white text-center mb-8">Awards &amp; Certifications</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              {awards.map((award, index) => (
                <motion.div
                  key={index}
                  whileHover={{ scale: 1.06, y: -5 }}
                  className="bg-white p-6 rounded-xl shadow-lg text-center cursor-pointer border border-slate-100"
                >
                  <Award className="h-12 w-12 text-yellow-500 mx-auto mb-4" />
                  <h4 className="font-semibold text-gray-900">{award}</h4>
                </motion.div>
              ))}
            </div>
          </motion.div>

          {/* Staff Testimonials â€” infinite marquee */}
          <motion.div
            initial={{ opacity: 0, y: 40 }}
            whileInView={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.7 }}
            viewport={{ amount: 0.2 }}
          >
            <h3 className="text-3xl font-bold text-white text-center mb-8">Staff &amp; Surgeon Reviews</h3>
            <div className="overflow-hidden relative">
              <div className="flex w-max" style={{ animation: 'marquee 20s linear infinite' }}>
                {[...testimonials, ...testimonials].map((t, index) => (
                  <motion.div
                    key={index}
                    whileHover={{ scale: 1.04 }}
                    className={`w-80 flex-shrink-0 bg-white p-6 rounded-xl shadow-lg cursor-pointer ${index !== 0 ? 'ml-6' : ''}`}
                  >
                    <div className="flex items-center mb-4">
                      <img src={t.image} alt={t.name} className="w-12 h-12 rounded-full object-cover mr-4" />
                      <div>
                        <h4 className="font-semibold text-gray-900">{t.name}</h4>
                        <div className="flex">
                          {[...Array(t.rating)].map((_, i) => (
                            <Star key={i} className="h-4 w-4 text-yellow-400 fill-current" />
                          ))}
                        </div>
                      </div>
                    </div>
                    <p className="text-gray-600 italic text-sm">"{t.comment}"</p>
                  </motion.div>
                ))}
              </div>
            </div>
          </motion.div>

          {/* Animated Rating */}
          <motion.div
            initial={{ opacity: 0, y: 35 }}
            whileInView={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
            whileHover={{ scale: 1.02 }}
            viewport={{ amount: 0.3 }}
            className="text-center bg-white p-8 rounded-2xl shadow-xl cursor-pointer border border-slate-100"
          >
            <div className="flex items-center justify-center space-x-2 mb-4">
              <Star className="h-8 w-8 text-yellow-400 fill-current" />
              <span className="text-3xl font-bold text-gray-900">{displayRating.toFixed(1)}</span>
              <span className="text-gray-600">/ 5.0</span>
            </div>
            <p className="text-gray-600 font-medium">Based on {displayReviews.toLocaleString()} hospital staff reviews</p>
          </motion.div>

        </div>
      </section>

      {/* â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â• CONTACT SECTION â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â• */}
      <section id="contact" className="py-20 bg-gradient-to-br from-teal-100 via-white to-white overflow-hidden">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">

          <motion.div
            initial={{ opacity: 0, y: 35 }}
            whileInView={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
            viewport={{ amount: 0.3 }}
            className="text-center mb-10"
          >
            <h2 className="text-4xl font-bold text-gray-900 mb-4">Contact Us</h2>
            <p className="text-xl text-gray-600">Get in touch with us for any inquiries or support</p>
          </motion.div>

          <div className="text-center mb-10">
            <p className="text-lg text-gray-700">For appointments or emergencies, call us at <strong>98406 35391</strong>.</p>
            <p className="text-lg text-gray-700">Or email us at <strong>support@smartot.hospital</strong></p>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-12">
            {/* Contact Info */}
            <motion.div
              initial={{ opacity: 0, x: -40 }}
              whileInView={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.7 }}
              viewport={{ amount: 0.3 }}
              className="space-y-8"
            >
              <h3 className="text-2xl font-bold text-gray-900 mb-6">Get In Touch</h3>
              <div className="space-y-6">
                {[
                  { Icon: Phone, bg: 'bg-red-100', color: 'text-red-600', title: 'Emergency Hotline', desc: '24/7 Emergency Services', link: '+91 9840635391', href: 'tel:+919840635391' },
                  { Icon: Phone, bg: 'bg-blue-100', color: 'text-blue-600', title: 'Appointments', desc: 'Book your appointment', link: '+91 9342929499', href: 'tel:+919342929499' },
                  { Icon: MapPin, bg: 'bg-green-100', color: 'text-green-600', title: 'Address', desc: 'Chennai Institute of Technology\nKundrathur\nChennai-69, India' },
                  { Icon: Mail, bg: 'bg-purple-100', color: 'text-purple-600', title: 'Email', desc: 'General inquiries', link: 'support@smartot.hospital', href: 'mailto:support@smartot.hospital' },
                  { Icon: Clock, bg: 'bg-yellow-100', color: 'text-yellow-600', title: 'Operating Hours', desc: `Monâ€“Fri: 8AMâ€“8PM\nSat: 9AMâ€“6PM\nSun: 10AMâ€“4PM\nEmergency: 24/7` },
                ].map((item, idx) => (
                  <motion.div
                    key={idx}
                    whileHover={{ scale: 1.02, x: 4 }}
                    className="flex items-start space-x-4 p-4 rounded-xl bg-white/60 hover:bg-white/90 shadow hover:shadow-md transition-all group cursor-pointer"
                  >
                    <div className={`${item.bg} p-3 rounded-full`}>
                      <item.Icon className={`h-6 w-6 ${item.color}`} />
                    </div>
                    <div>
                      <h4 className="font-semibold text-gray-900">{item.title}</h4>
                      <p className="text-gray-600 whitespace-pre-line text-sm">{item.desc}</p>
                      {item.link && (
                        <a href={item.href} className={`${item.color} font-semibold hover:underline text-sm`}>{item.link}</a>
                      )}
                    </div>
                  </motion.div>
                ))}
              </div>
            </motion.div>

            {/* Contact Form */}
            <motion.div
              initial={{ opacity: 0, x: 40 }}
              whileInView={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.7 }}
              viewport={{ amount: 0.3 }}
              className="bg-white/80 p-8 rounded-2xl shadow-lg backdrop-blur-md border border-white"
            >
              <h3 className="text-2xl font-bold text-gray-900 mb-6">Send us a Message</h3>
              <form onSubmit={handleFormSubmit} className="space-y-6">
                {[
                  { label: 'Full Name *', type: 'text', name: 'name', placeholder: 'Your full name' },
                  { label: 'Email Address *', type: 'email', name: 'email', placeholder: 'your.email@example.com' },
                  { label: 'Subject *', type: 'text', name: 'subject', placeholder: 'What is this about?' },
                ].map((field) => (
                  <div key={field.name}>
                    <label htmlFor={field.name} className="block text-sm font-medium text-gray-700 mb-2">{field.label}</label>
                    <input type={field.type} id={field.name} name={field.name} required
                      value={(formData as any)[field.name]} onChange={handleFormChange}
                      className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-transparent text-sm"
                      placeholder={field.placeholder} />
                  </div>
                ))}
                <div>
                  <label htmlFor="message" className="block text-sm font-medium text-gray-700 mb-2">Message *</label>
                  <textarea id="message" name="message" required rows={4} value={formData.message} onChange={handleFormChange}
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-transparent text-sm"
                    placeholder="Please describe your inquiry in detail..." />
                </div>
                <button type="submit" className="w-full bg-teal-600 text-white px-6 py-3 rounded-xl hover:bg-teal-700 hover:scale-105 hover:shadow-lg transition-all flex items-center justify-center space-x-2 font-semibold">
                  <Send className="h-5 w-5 animate-pulse" /><span>Send Message</span>
                </button>
              </form>
            </motion.div>
          </div>

          {/* Emergency Banner */}
          <motion.div
            initial={{ opacity: 0, y: 35 }}
            whileInView={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
            viewport={{ amount: 0.3 }}
            className="mt-16 bg-red-50 border border-red-200 rounded-2xl p-8 text-center shadow-md"
          >
            <h3 className="text-2xl font-bold text-red-900 mb-4">Critical OT Emergency?</h3>
            <p className="text-red-700 mb-6">
              If you are experiencing a critical operating theatre emergency or patient safety incident, please call our emergency hotline immediately or visit our emergency department.
            </p>
            <a href="tel:+919840635391" className="inline-flex items-center space-x-2 bg-red-600 text-white px-8 py-4 rounded-xl hover:bg-red-700 transition-colors text-lg font-semibold hover:scale-105 shadow-md">
              <Phone className="h-6 w-6" /><span>Call Emergency: +91 9840635391</span>
            </a>
          </motion.div>

          {/* Footer */}
          <footer className="mt-20 pt-8 border-t border-gray-200 text-center text-sm text-gray-600 bg-gray-200/40 rounded-2xl py-6">
            <p className="text-gray-800 font-medium">&copy; {new Date().getFullYear()} SmartOT Command. All rights reserved.</p>
            <div className="flex justify-center space-x-6 mt-4 text-gray-700">
              <a href="https://www.facebook.com/" target="_blank" rel="noopener noreferrer" className="hover:text-blue-600 transition-transform transform hover:scale-110" title="Facebook">
                <svg className="h-5 w-5 fill-current" viewBox="0 0 24 24"><path d="M24 12.073C24 5.405 18.627 0 12 0S0 5.405 0 12.073c0 6.027 4.388 11.02 10.125 11.927v-8.437H7.078v-3.49h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.49h-2.796v8.437C19.612 23.093 24 18.1 24 12.073z"/></svg>
              </a>
              <a href="https://www.instagram.com/" target="_blank" rel="noopener noreferrer" className="hover:text-pink-500 transition-transform transform hover:scale-110" title="Instagram">
                <svg className="h-5 w-5 fill-current" viewBox="0 0 24 24"><path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zM12 0C8.741 0 8.333.014 7.053.072 2.695.272.273 2.69.073 7.052.014 8.333 0 8.741 0 12c0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98C8.333 23.986 8.741 24 12 24c3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98C15.668.014 15.259 0 12 0zm0 5.838a6.162 6.162 0 100 12.324 6.162 6.162 0 000-12.324zM12 16a4 4 0 110-8 4 4 0 010 8zm6.406-11.845a1.44 1.44 0 100 2.881 1.44 1.44 0 000-2.881z"/></svg>
              </a>
              <a href="https://www.linkedin.com/" target="_blank" rel="noopener noreferrer" className="hover:text-blue-700 transition-transform transform hover:scale-110" title="LinkedIn">
                <svg className="h-5 w-5 fill-current" viewBox="0 0 24 24"><path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433a2.062 2.062 0 01-2.063-2.065 2.064 2.064 0 112.063 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z"/></svg>
              </a>
              <a href="https://wa.me/919840635391" target="_blank" rel="noopener noreferrer" className="hover:text-green-500 transition-transform transform hover:scale-110" title="WhatsApp">
                <svg className="h-5 w-5 fill-current" viewBox="0 0 24 24"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/></svg>
              </a>
              <a href="https://www.youtube.com/" target="_blank" rel="noopener noreferrer" className="hover:text-red-600 transition-transform transform hover:scale-110" title="YouTube">
                <svg className="h-5 w-5 fill-current" viewBox="0 0 24 24"><path d="M23.495 6.205a3.007 3.007 0 00-2.088-2.088c-1.87-.501-9.396-.501-9.396-.501s-7.507-.01-9.396.501A3.007 3.007 0 00.527 6.205a31.247 31.247 0 00-.522 5.805 31.247 31.247 0 00.522 5.783 3.007 3.007 0 002.088 2.088c1.868.502 9.396.502 9.396.502s7.506 0 9.396-.502a3.007 3.007 0 002.088-2.088 31.247 31.247 0 00.5-5.783 31.247 31.247 0 00-.5-5.805zM9.609 15.601V8.408l6.264 3.602z"/></svg>
              </a>
            </div>
          </footer>

        </div>
      </section>

      {/* â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â• LOGIN MODAL â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â• */}
      {showLoginModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="w-full max-w-md bg-white rounded-2xl shadow-2xl border border-slate-100 p-6 sm:p-8 space-y-6 relative">
            <button onClick={() => setShowLoginModal(false)} className="absolute top-4 right-4 p-2 text-slate-400 hover:text-slate-600 rounded-full hover:bg-slate-100 transition">
              <X className="h-5 w-5" />
            </button>
            <div className="text-center space-y-2">
              <div className="h-12 w-12 rounded-2xl bg-teal-600 text-white flex items-center justify-center mx-auto shadow-md">
                <Activity className="h-7 w-7" />
              </div>
              <h2 className="text-2xl font-bold text-slate-900">SmartOT Command Login</h2>
              <p className="text-xs text-slate-500">Access hospital OT workflows, delay risk metrics, and live scheduling</p>
            </div>
            {error && (
              <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs font-semibold text-center">{error}</div>
            )}
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="text-xs font-semibold text-slate-700 block mb-1">Staff Email Address</label>
                <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} required
                  className="w-full px-3.5 py-2.5 rounded-xl bg-slate-50 border border-slate-300 text-sm text-slate-900 focus:outline-none focus:border-teal-600"
                  placeholder="Enter email address" />
              </div>
              <div>
                <label className="text-xs font-semibold text-slate-700 block mb-1">Password</label>
                <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} required
                  className="w-full px-3.5 py-2.5 rounded-xl bg-slate-50 border border-slate-300 text-sm text-slate-900 focus:outline-none focus:border-teal-600"
                  placeholder="Enter password" />
              </div>
              <button type="submit" disabled={isLoading}
                className="w-full py-3.5 rounded-xl bg-teal-600 hover:bg-teal-700 text-white font-bold text-sm shadow-md transition flex items-center justify-center space-x-2 disabled:opacity-50">
                <span>{isLoading ? 'Authenticating...' : 'Sign In to Command Center'}</span>
                <ArrowRight className="h-4 w-4" />
              </button>
            </form>
            <div className="pt-4 border-t border-slate-200 space-y-2">
              <p className="text-[11px] font-bold uppercase tracking-wider text-slate-500 text-center">Or Sign In with Demo Account:</p>
              <div className="grid grid-cols-2 gap-2">
                {DEMO_ACCOUNTS.map((u) => (
                  <button key={u.role} onClick={() => handleQuickLogin(u.role)}
                    className="p-2.5 rounded-xl bg-slate-50 hover:bg-teal-50 border border-slate-200 hover:border-teal-300 text-left transition text-xs shadow-sm">
                    <p className="font-bold text-slate-900 truncate">{u.name}</p>
                    <p className="text-[10px] text-teal-700 font-semibold">{u.role.replace('_', ' ')}</p>
                  </button>
                ))}

              </div>
            </div>
            <div className="p-3 rounded-xl bg-slate-50 border border-slate-200 text-[10px] text-slate-500 text-center flex items-center justify-center space-x-1.5">
              <ShieldCheck className="h-3.5 w-3.5 text-teal-600" />
              <span>SmartOT Platform â€” Operations &amp; Delay Risk Intelligence</span>
            </div>
          </div>
        </div>
      )}

      <style>{`
        @keyframes marquee {
          0% { transform: translateX(0); }
          100% { transform: translateX(-50%); }
        }
        @keyframes slideDown {
          0%   { opacity: 0; transform: translateY(-12px); }
          100% { opacity: 1; transform: translateY(0); }
        }
        .animate-slideDown {
          animation: slideDown 0.22s ease-out forwards;
        }
      `}</style>
    </div>
  );
};

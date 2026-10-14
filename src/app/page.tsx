import {
  Compass,
  MapPin,
  Sparkles,
  ArrowRight,
  ShieldCheck,
  Layers,
  Heart,
  Share2,
} from 'lucide-react';
import { InstagramIcon, YouTubeIcon, FacebookIcon, LinkedInIcon } from '@/components/ui/social-icons';
import { DEFAULT_CATEGORIES } from '@/lib/constants';

export default function LandingPage() {
  return (
    <div className="relative overflow-hidden bg-slate-50 dark:bg-slate-950">
      
      {/* Background Glows */}
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-full max-w-7xl h-96 bg-gradient-to-tr from-indigo-500/15 via-purple-500/10 to-amber-500/10 blur-3xl pointer-events-none" />

      {/* Hero Section */}
      <section className="relative pt-20 pb-16 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto text-center">
        <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-indigo-50 dark:bg-indigo-950/80 text-indigo-700 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-800 text-xs font-bold mb-6 shadow-sm">
          <Sparkles className="w-4 h-4 text-amber-500" />
          <span>India's Location-Based Social Media Portal</span>
        </div>

        <h1 className="text-4xl sm:text-6xl font-black text-slate-900 dark:text-white tracking-tight max-w-4xl mx-auto leading-tight sm:leading-none">
          Local stories, trending reels & community insights,{' '}
          <span className="bg-gradient-to-r from-indigo-600 via-purple-600 to-amber-500 bg-clip-text text-transparent">
            right where you are
          </span>
        </h1>

        <p className="mt-6 text-base sm:text-lg text-slate-600 dark:text-slate-400 max-w-2xl mx-auto leading-relaxed">
          Tellme Bro curates the finest Instagram reels, YouTube shorts, Facebook updates, and LinkedIn stories targeted specifically to your city, district, and interests.
        </p>

        {/* Call to Actions */}
        <div className="mt-10 flex flex-col sm:flex-row items-center justify-center gap-4">
          <a
            href="/home"
            className="w-full sm:w-auto flex items-center justify-center gap-2 px-8 py-3.5 rounded-full text-sm font-bold text-white bg-indigo-600 hover:bg-indigo-700 shadow-lg shadow-indigo-600/30 hover:scale-105 transition-all"
          >
            Explore Public Feed
            <ArrowRight className="w-4 h-4" />
          </a>
          <a
            href="/login"
            className="w-full sm:w-auto px-8 py-3.5 rounded-full text-sm font-bold text-slate-700 dark:text-slate-200 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800 shadow-sm transition"
          >
            Sign In / Test Roles
          </a>
        </div>

        {/* Social Platform Badges */}
        <div className="mt-12 flex items-center justify-center gap-6 text-slate-400 text-xs font-semibold">
          <span className="flex items-center gap-1.5"><InstagramIcon className="w-4 h-4 text-pink-500" /> Instagram</span>
          <span className="flex items-center gap-1.5"><FacebookIcon className="w-4 h-4 text-blue-600" /> Facebook</span>
          <span className="flex items-center gap-1.5"><YouTubeIcon className="w-4 h-4 text-red-600" /> YouTube</span>
          <span className="flex items-center gap-1.5"><LinkedInIcon className="w-4 h-4 text-sky-700" /> LinkedIn</span>
        </div>
      </section>

      {/* Feature Showcase Grid */}
      <section className="py-16 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          
          <div className="p-8 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-sm">
            <div className="w-12 h-12 rounded-2xl bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400 flex items-center justify-center mb-5">
              <MapPin className="w-6 h-6" />
            </div>
            <h3 className="text-lg font-bold text-slate-900 dark:text-white mb-2">
              Hyper-Local Targeting
            </h3>
            <p className="text-xs text-slate-500 leading-relaxed">
              Automatic browser reverse-geocoding, IP fallback, and manual city search ensure you see content tailored to your district, city, or state.
            </p>
          </div>

          <div className="p-8 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-sm">
            <div className="w-12 h-12 rounded-2xl bg-purple-50 dark:bg-purple-950/60 text-purple-600 dark:text-purple-400 flex items-center justify-center mb-5">
              <Layers className="w-6 h-6" />
            </div>
            <h3 className="text-lg font-bold text-slate-900 dark:text-white mb-2">
              Curated Topics
            </h3>
            <p className="text-xs text-slate-500 leading-relaxed">
              Explore dynamic categories including Education, Fashion, Medical, Business, and Community stories with granular subcategories and tags.
            </p>
          </div>

          <div className="p-8 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-sm">
            <div className="w-12 h-12 rounded-2xl bg-amber-50 dark:bg-amber-950/60 text-amber-600 dark:text-amber-400 flex items-center justify-center mb-5">
              <ShieldCheck className="w-6 h-6" />
            </div>
            <h3 className="text-lg font-bold text-slate-900 dark:text-white mb-2">
              Strict 4-Role RBAC
            </h3>
            <p className="text-xs text-slate-500 leading-relaxed">
              Super Admin, Admin, Editor, and User roles with server-side authorization enforcement, 2FA support, and immutable audit logs.
            </p>
          </div>

        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-slate-200 dark:border-slate-800 py-8 text-center text-xs text-slate-400">
        <p>© 2026 Tellme Bro. Location-Aware Social Media Portal. Built for community curation.</p>
      </footer>
    </div>
  );
}

'use client';

import { useAuth } from '../features/auth/useAuth';
import { LandingHeader } from '../features/landing/LandingHeader';
import { Hero } from '../features/landing/Hero';
import { ProductPreview } from '../features/landing/ProductPreview';
import { FeatureGrid } from '../features/landing/FeatureGrid';
import { HowItWorks } from '../features/landing/HowItWorks';
import { SecuritySection } from '../features/landing/SecuritySection';
import { CtaSection } from '../features/landing/CtaSection';
import { LandingFooter } from '../features/landing/LandingFooter';

export default function LandingPage() {
  // The page renders for everyone; a resumed session only swaps the CTAs to "Open dashboard".
  const { isAuthenticated } = useAuth();

  return (
    <div className="min-h-dvh overflow-x-clip bg-bg">
      <LandingHeader isAuthenticated={isAuthenticated} />
      <main>
        <Hero isAuthenticated={isAuthenticated} />
        <ProductPreview />
        <FeatureGrid />
        <HowItWorks />
        <SecuritySection />
        <CtaSection isAuthenticated={isAuthenticated} />
      </main>
      <LandingFooter />
    </div>
  );
}

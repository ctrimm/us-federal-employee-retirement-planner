/**
 * Main FEREX Application Component
 * Orchestrates onboarding, scenarios, dashboard, and comparison
 */

import { useState, useEffect } from 'react';
import type { Scenario, UserProfile } from '../types';
import { useScenario } from '../hooks/useScenario';
import { useLocalStorage } from '../hooks/useLocalStorage';
import { ExpressOnboarding } from './onboarding/ExpressOnboarding';
import { ComprehensiveOnboarding } from './onboarding/ComprehensiveOnboarding';
import { Dashboard } from './dashboard/Dashboard';
import { UnifiedControlPanel } from './dashboard/UnifiedControlPanel';
import { sampleScenarios } from '../data/sampleScenarios';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { ErrorBoundary } from '@/components/ErrorBoundary';

type AppView = 'landing' | 'onboarding' | 'dashboard';
type OnboardingMode = 'express' | 'comprehensive';

export function FerexApp() {
  const [view, setView] = useState<AppView>('landing');
  const [onboardingMode, setOnboardingMode] = useState<OnboardingMode>('express');
  const [isControlPanelOpen, setIsControlPanelOpen] = useState(false);
  const [isHydrated, setIsHydrated] = useState(false);

  const [savedScenario, setSavedScenario] = useLocalStorage<Scenario | null>(
    'ferex-current-scenario',
    null
  );

  // Handle hydration
  useEffect(() => {
    setIsHydrated(true);
  }, []);

  const {
    scenario,
    projections,
    eligibility,
    pensionBreakdown,
    isCalculating,
    createScenario,
    loadScenario,
    updateProfile,
  } = useScenario(savedScenario || undefined);

  const handleOnboardingComplete = (profile: UserProfile) => {
    const newScenario = createScenario('My Retirement Plan', profile);
    setSavedScenario(newScenario);
    setView('dashboard');
  };

  const handleLoadSample = (sample: Scenario) => {
    loadScenario(sample);
    setSavedScenario(sample);
    setView('dashboard');
  };

  const handleStartNew = (mode: OnboardingMode = 'express') => {
    setSavedScenario(null);
    setOnboardingMode(mode);
    setView('onboarding');
  };

  const handleUpdateProfile = (updates: Partial<UserProfile>) => {
    console.log('[FerexApp] handleUpdateProfile called', Object.keys(updates));
    // Hook handles all the deep merging and state updates
    updateProfile(updates);
  };

  // Sync scenario changes to localStorage
  // This runs AFTER the hook has updated the scenario state
  useEffect(() => {
    if (scenario) {
      console.log('[FerexApp] Syncing scenario to localStorage', scenario.id);
      setSavedScenario(scenario);
    }
  }, [scenario, setSavedScenario]);

  // Landing Page
  if (view === 'landing') {
    return (
      <div className="min-h-screen bg-gradient-to-b from-blue-50 to-white">
        <div className="container mx-auto px-4 py-16">
          <div className="max-w-4xl mx-auto text-center">
            <h1 className="text-5xl font-bold mb-4 bg-gradient-to-r from-blue-600 to-blue-800 bg-clip-text text-transparent">
              FEREX
            </h1>
            <h2 className="text-3xl font-semibold mb-6">
              Federal Employee Retirement Explorer
            </h2>
            <p className="text-xl text-muted-foreground mb-12">
              Decode your federal retirement. Understand your FERS, CSRS, TSP, and survivor
              benefits in minutes with interactive charts and comparisons.
            </p>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-12">
              <Card className="p-8 text-left hover:shadow-lg transition-shadow cursor-pointer" onClick={handleStartNew}>
                <div className="mb-4">
                  <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center mb-4">
                    <svg
                      className="w-6 h-6 text-blue-600"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M13 10V3L4 14h7v7l9-11h-7z"
                      />
                    </svg>
                  </div>
                  <h3 className="text-2xl font-bold mb-2">Quick Check</h3>
                  <p className="text-muted-foreground mb-4">~3 minutes</p>
                  <p>
                    Get a fast retirement estimate with minimal inputs. Perfect for a quick
                    overview.
                  </p>
                </div>
                <Button className="w-full mt-4">Start Quick Check →</Button>
              </Card>

              <Card className="p-8 text-left hover:shadow-lg transition-shadow cursor-pointer" onClick={() => handleStartNew('comprehensive')}>
                <div className="mb-4">
                  <div className="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center mb-4">
                    <svg
                      className="w-6 h-6 text-green-600"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
                      />
                    </svg>
                  </div>
                  <h3 className="text-2xl font-bold mb-2">Detailed Planning</h3>
                  <p className="text-muted-foreground mb-4">~10 minutes</p>
                  <p>
                    Comprehensive inputs for precision planning. Includes survivor benefits,
                    healthcare, and scenario modeling.
                  </p>
                </div>
                <Button className="w-full mt-4">Start Detailed Planning →</Button>
              </Card>
            </div>

            {/* Sample Scenarios */}
            <div className="mt-16">
              <h3 className="text-2xl font-bold mb-6">Or explore a sample scenario</h3>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {sampleScenarios.map((sample) => (
                  <Card
                    key={sample.id}
                    className="p-6 text-left hover:shadow-lg transition-shadow cursor-pointer"
                    onClick={() => handleLoadSample(sample)}
                  >
                    <h4 className="font-bold mb-2">{sample.name}</h4>
                    <p className="text-sm text-muted-foreground mb-4">
                      {sample.metadata.description}
                    </p>
                    <div className="flex flex-wrap gap-2">
                      {sample.metadata.tags?.map((tag) => (
                        <span
                          key={tag}
                          className="text-xs px-2 py-1 bg-blue-100 text-blue-700 rounded"
                        >
                          {tag}
                        </span>
                      ))}
                    </div>
                  </Card>
                ))}
              </div>
            </div>

            {/* Continue Previous - only show after hydration to avoid SSR mismatch */}
            {isHydrated && savedScenario && (
              <div className="mt-12">
                <Button
                  variant="outline"
                  size="lg"
                  onClick={() => setView('dashboard')}
                >
                  Continue Previous Scenario
                </Button>
              </div>
            )}
          </div>
        </div>
      </div>
    );
  }

  // Onboarding View
  if (view === 'onboarding') {
    return (
      <ErrorBoundary>
        <div className="min-h-screen bg-gray-50 py-8">
          {onboardingMode === 'express' ? (
            <ExpressOnboarding
              onComplete={handleOnboardingComplete}
              onCancel={() => setView('landing')}
            />
          ) : (
            <ComprehensiveOnboarding
              onComplete={handleOnboardingComplete}
              onCancel={() => setView('landing')}
            />
          )}
        </div>
      </ErrorBoundary>
    );
  }

  // Dashboard View
  if (view === 'dashboard' && scenario) {
    return (
      <div className="min-h-screen bg-gray-50">
        <div className="bg-white border-b shadow-sm mb-6">
          <div className="container mx-auto px-4 py-4 flex justify-between items-center">
            <Button variant="ghost" onClick={() => setView('landing')}>
              ← Back to Home
            </Button>
            <Button variant="outline" onClick={handleStartNew}>
              New Scenario
            </Button>
          </div>
        </div>

        {/* Unified Control Panel */}
        <UnifiedControlPanel
          profile={scenario.profile}
          onUpdate={handleUpdateProfile}
          isOpen={isControlPanelOpen}
          onToggle={() => setIsControlPanelOpen(!isControlPanelOpen)}
        />

        {isCalculating ? (
          <div className="flex items-center justify-center min-h-[400px]">
            <div className="text-center">
              <div className="w-16 h-16 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
              <p className="text-lg text-muted-foreground">Calculating your retirement...</p>
            </div>
          </div>
        ) : (
          <Dashboard
            scenario={scenario}
            projections={projections}
            eligibility={eligibility}
            pensionBreakdown={pensionBreakdown}
            onUpdateProfile={handleUpdateProfile}
          />
        )}
      </div>
    );
  }

  return null;
}

# Email Save/Resume Feature - Engineering Specification

## 🎯 Goal
Allow users to save their retirement scenario and resume it later on any device using a shareable URL. Optionally capture email for lead generation without requiring a backend/database.

## 🔐 Privacy-First Design

**Key Principles:**
- ✅ No backend/database - everything client-side
- ✅ No PII in URL - use hashed identifiers
- ✅ Scenario data encoded in URL params
- ✅ Email optional, stored only in localStorage
- ✅ Works offline, no tracking

---

## 📐 Architecture

### Option A: Full Client-Side (Recommended)

```
User Creates Scenario
    ↓
Serialize scenario → Base64 → Compress → Hash for ID
    ↓
Generate URL: /ferex?s=<hash>&d=<compressed-data>
    ↓
Optional: User enters email → Store in localStorage only
    ↓
Copy shareable URL or bookmark
    ↓
User visits URL later → Decompress → Load scenario
```

**Pros:**
- Zero backend cost
- Instant, works offline
- Maximum privacy
- No GDPR concerns

**Cons:**
- Long URLs (can mitigate with compression)
- No email notifications (unless we add optional webhook)

### Option B: Hybrid (Email + Client-Side)

```
User Creates Scenario
    ↓
Serialize scenario → Compress → Generate unique hash
    ↓
URL: /ferex?id=<short-hash>
    ↓
User enters email → POST to serverless function
    ↓
Function stores: { hash: <id>, email: <email>, timestamp }
    ↓
Function sends email with URL
    ↓
Data stays encoded in URL, email just for contact
```

**Pros:**
- Short, clean URLs
- Can send reminder emails
- Email list for marketing
- Still works offline after first load

**Cons:**
- Needs serverless function (Vercel/Netlify)
- GDPR compliance needed
- Slight complexity

---

## 🛠️ Implementation Plan (Option A - Recommended)

### Phase 1: URL State Encoding

#### 1.1 Create Encoding Utility

**File: `src/ferex/utils/scenarioEncoding.ts`**

```typescript
import { Scenario } from '../types';
import pako from 'pako'; // gzip compression library

/**
 * Serialize scenario to compressed base64 string
 */
export function encodeScenario(scenario: Scenario): string {
  try {
    // Convert to JSON
    const json = JSON.stringify(scenario);

    // Compress with gzip
    const compressed = pako.gzip(json);

    // Convert to base64
    const base64 = btoa(String.fromCharCode(...compressed));

    // URL-safe base64
    return base64
      .replace(/\+/g, '-')
      .replace(/\//g, '_')
      .replace(/=/g, '');
  } catch (error) {
    console.error('Failed to encode scenario:', error);
    throw new Error('Failed to encode scenario');
  }
}

/**
 * Deserialize compressed base64 string to scenario
 */
export function decodeScenario(encoded: string): Scenario {
  try {
    // Reverse URL-safe base64
    const base64 = encoded
      .replace(/-/g, '+')
      .replace(/_/g, '/')
      + '=='.substring(0, (3 * encoded.length) % 4);

    // Decode base64
    const binary = atob(base64);
    const bytes = new Uint8Array(binary.length);
    for (let i = 0; i < binary.length; i++) {
      bytes[i] = binary.charCodeAt(i);
    }

    // Decompress
    const decompressed = pako.ungzip(bytes, { to: 'string' });

    // Parse JSON
    const scenario = JSON.parse(decompressed);

    // Reconstruct Date objects
    return reconstructDates(scenario);
  } catch (error) {
    console.error('Failed to decode scenario:', error);
    throw new Error('Invalid or corrupted scenario data');
  }
}

/**
 * Reconstruct Date objects from serialized data
 */
function reconstructDates(scenario: any): Scenario {
  // Convert date strings back to Date objects
  if (scenario.createdAt) scenario.createdAt = new Date(scenario.createdAt);
  if (scenario.lastModified) scenario.lastModified = new Date(scenario.lastModified);

  // Employment dates
  if (scenario.profile?.employment?.servicePeriods) {
    scenario.profile.employment.servicePeriods =
      scenario.profile.employment.servicePeriods.map((p: any) => ({
        ...p,
        startDate: new Date(p.startDate),
        endDate: p.endDate ? new Date(p.endDate) : undefined,
      }));
  }

  // Non-federal employment dates
  if (scenario.profile?.employment?.nonFederalPeriods) {
    scenario.profile.employment.nonFederalPeriods =
      scenario.profile.employment.nonFederalPeriods.map((p: any) => ({
        ...p,
        startDate: new Date(p.startDate),
        endDate: p.endDate ? new Date(p.endDate) : undefined,
      }));
  }

  return scenario;
}

/**
 * Generate a short hash for the scenario (for display/tracking)
 */
export function generateScenarioHash(scenario: Scenario): string {
  const str = JSON.stringify({
    id: scenario.id,
    name: scenario.name,
    created: scenario.createdAt,
  });

  // Simple hash function
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash; // Convert to 32bit integer
  }

  return Math.abs(hash).toString(36).substring(0, 8);
}
```

#### 1.2 Add URL State Management

**File: `src/ferex/hooks/useURLState.ts`**

```typescript
import { useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom'; // or Next.js router
import { Scenario } from '../types';
import { encodeScenario, decodeScenario } from '../utils/scenarioEncoding';

export function useURLState() {
  const [searchParams, setSearchParams] = useSearchParams();
  const [scenarioFromURL, setScenarioFromURL] = useState<Scenario | null>(null);
  const [urlError, setUrlError] = useState<string | null>(null);

  // Load scenario from URL on mount
  useEffect(() => {
    const encodedData = searchParams.get('d'); // 'd' for data

    if (encodedData) {
      try {
        const scenario = decodeScenario(encodedData);
        setScenarioFromURL(scenario);
        console.log('[useURLState] Loaded scenario from URL:', scenario.name);
      } catch (error) {
        console.error('[useURLState] Failed to decode URL:', error);
        setUrlError('Invalid or corrupted scenario link');
      }
    }
  }, [searchParams]);

  /**
   * Save scenario to URL
   */
  const saveToURL = (scenario: Scenario) => {
    try {
      const encoded = encodeScenario(scenario);
      const newParams = new URLSearchParams();
      newParams.set('d', encoded);

      setSearchParams(newParams, { replace: true });

      return window.location.href; // Return full URL for sharing
    } catch (error) {
      console.error('[useURLState] Failed to save to URL:', error);
      throw error;
    }
  };

  /**
   * Clear URL state
   */
  const clearURL = () => {
    setSearchParams({}, { replace: true });
  };

  return {
    scenarioFromURL,
    urlError,
    saveToURL,
    clearURL,
  };
}
```

---

### Phase 2: Save/Share UI Component

**File: `src/ferex/components/SaveShareModal.tsx`**

```typescript
import { useState } from 'react';
import { Scenario } from '../types';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { encodeScenario, generateScenarioHash } from '../utils/scenarioEncoding';

interface SaveShareModalProps {
  scenario: Scenario;
  isOpen: boolean;
  onClose: () => void;
}

export function SaveShareModal({ scenario, isOpen, onClose }: SaveShareModalProps) {
  const [email, setEmail] = useState('');
  const [shareURL, setShareURL] = useState('');
  const [copied, setCopied] = useState(false);
  const [emailSaved, setEmailSaved] = useState(false);

  if (!isOpen) return null;

  const generateShareURL = () => {
    try {
      const encoded = encodeScenario(scenario);
      const baseURL = window.location.origin + window.location.pathname;
      const url = `${baseURL}?d=${encoded}`;
      setShareURL(url);
      return url;
    } catch (error) {
      console.error('Failed to generate share URL:', error);
      return null;
    }
  };

  const handleCopyURL = () => {
    const url = shareURL || generateShareURL();
    if (url) {
      navigator.clipboard.writeText(url);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const handleSaveEmail = () => {
    if (email && email.includes('@')) {
      // Store email in localStorage for future use (optional)
      localStorage.setItem('ferex-user-email', email);
      setEmailSaved(true);

      // Track email signup (can add analytics here)
      console.log('[SaveShare] Email saved:', email);

      // Could send to serverless function here for email list
      // fetch('/api/subscribe', { method: 'POST', body: JSON.stringify({ email }) });
    }
  };

  const handleEmailLink = () => {
    const url = shareURL || generateShareURL();
    if (url && email) {
      // Use mailto link to email themselves the URL
      const subject = encodeURIComponent('My FEREX Retirement Plan');
      const body = encodeURIComponent(
        `Here's your retirement plan:\n\n${url}\n\nBookmark this link to access your plan anytime!`
      );
      window.location.href = `mailto:${email}?subject=${subject}&body=${body}`;
    }
  };

  const scenarioHash = generateScenarioHash(scenario);

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <Card className="max-w-lg w-full p-6 bg-white">
        <h2 className="text-2xl font-bold mb-4">Save & Share Your Plan</h2>

        <div className="mb-6">
          <p className="text-sm text-gray-600 mb-2">
            Your retirement plan: <strong>{scenario.name}</strong>
          </p>
          <p className="text-xs text-gray-500">
            Plan ID: {scenarioHash}
          </p>
        </div>

        {/* Share URL Section */}
        <div className="mb-6 p-4 bg-blue-50 rounded-lg">
          <h3 className="font-semibold mb-2">📋 Shareable Link</h3>
          <p className="text-sm text-gray-600 mb-3">
            Your plan is encoded in this URL. Bookmark it or share with your spouse/advisor.
          </p>
          <div className="flex gap-2">
            <input
              type="text"
              value={shareURL || 'Click Generate to create link...'}
              readOnly
              className="flex-1 px-3 py-2 border rounded text-sm"
            />
            <Button onClick={handleCopyURL} size="sm">
              {copied ? '✓ Copied!' : 'Copy'}
            </Button>
          </div>
          {!shareURL && (
            <Button onClick={generateShareURL} className="w-full mt-2" size="sm">
              Generate Link
            </Button>
          )}
        </div>

        {/* Email Section */}
        <div className="mb-6 p-4 bg-green-50 rounded-lg">
          <h3 className="font-semibold mb-2">✉️ Email Yourself</h3>
          <p className="text-sm text-gray-600 mb-3">
            Get the link emailed to you. We'll never spam you.
          </p>
          <div className="space-y-2">
            <input
              type="email"
              placeholder="your.email@example.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full px-3 py-2 border rounded"
            />
            <div className="flex gap-2">
              <Button
                onClick={handleEmailLink}
                className="flex-1"
                disabled={!email || !email.includes('@')}
              >
                Email Me the Link
              </Button>
              {!emailSaved && (
                <Button
                  onClick={handleSaveEmail}
                  variant="outline"
                  disabled={!email || !email.includes('@')}
                >
                  Save Email
                </Button>
              )}
            </div>
            {emailSaved && (
              <p className="text-xs text-green-600">✓ Email saved for future use</p>
            )}
          </div>
        </div>

        {/* Privacy Notice */}
        <div className="mb-4 p-3 bg-gray-50 rounded text-xs text-gray-600">
          <strong>Privacy:</strong> Your plan data is encoded in the URL.
          We don't store anything on our servers. Your email (if provided)
          stays in your browser's local storage only.
        </div>

        <div className="flex gap-2">
          <Button onClick={onClose} variant="outline" className="flex-1">
            Close
          </Button>
          <Button onClick={handleCopyURL} className="flex-1">
            Copy & Close
          </Button>
        </div>
      </Card>
    </div>
  );
}
```

---

### Phase 3: Integration with FerexApp

**File: `src/ferex/components/FerexApp.tsx`**

```typescript
// Add to imports
import { useURLState } from '../hooks/useURLState';
import { SaveShareModal } from './SaveShareModal';

// Add state
const [isSaveModalOpen, setIsSaveModalOpen] = useState(false);
const { scenarioFromURL, urlError, saveToURL } = useURLState();

// Load scenario from URL on mount
useEffect(() => {
  if (scenarioFromURL && !scenario) {
    loadScenario(scenarioFromURL);
    setSavedScenario(scenarioFromURL);
    setView('dashboard');
  }
}, [scenarioFromURL]);

// Show error if URL is corrupted
useEffect(() => {
  if (urlError) {
    alert(urlError);
  }
}, [urlError]);

// Add Save button to dashboard header
<div className="container mx-auto px-4 py-4 flex justify-between items-center">
  <Button variant="ghost" onClick={() => setView('landing')}>
    ← Back to Home
  </Button>
  <div className="flex gap-2">
    <Button
      variant="outline"
      onClick={() => setIsSaveModalOpen(true)}
    >
      💾 Save & Share
    </Button>
    <Button variant="outline" onClick={handleStartNew}>
      New Scenario
    </Button>
  </div>
</div>

// Add modal at bottom
<SaveShareModal
  scenario={scenario}
  isOpen={isSaveModalOpen}
  onClose={() => setIsSaveModalOpen(false)}
/>
```

---

### Phase 4: Add pako Dependency

```bash
npm install pako
npm install --save-dev @types/pako
```

---

## 📊 URL Structure

### Example URL:
```
https://ferex.app/?d=eJyNVE1v2zAM_SuCTjsErmM3TdYBPS6HYsO6w7BDEYSG...
```

**Breakdown:**
- `d=` : Data parameter (compressed, base64-encoded scenario)
- Length: ~500-2000 characters (depending on scenario complexity)

**URL Shortening (Optional Future Enhancement):**
- Use bit.ly API or custom shortener
- Map long URL → short code
- Store in KV store (Cloudflare Workers KV, Vercel Edge Config)

---

## 🧪 Testing Strategy

### Unit Tests:
```typescript
describe('scenarioEncoding', () => {
  it('should encode and decode scenario without data loss', () => {
    const original = createTestScenario();
    const encoded = encodeScenario(original);
    const decoded = decodeScenario(encoded);

    expect(decoded.id).toBe(original.id);
    expect(decoded.name).toBe(original.name);
    expect(decoded.profile.personal.birthYear).toBe(original.profile.personal.birthYear);
  });

  it('should handle Date objects correctly', () => {
    const scenario = createTestScenario();
    const encoded = encodeScenario(scenario);
    const decoded = decodeScenario(encoded);

    expect(decoded.createdAt).toBeInstanceOf(Date);
    expect(decoded.profile.employment.servicePeriods[0].startDate).toBeInstanceOf(Date);
  });

  it('should throw error for corrupted data', () => {
    expect(() => decodeScenario('invalid-data')).toThrow();
  });
});
```

### E2E Tests:
1. Create scenario → Click Save → Copy URL
2. Open URL in new browser → Verify scenario loads
3. Modify scenario → Save again → Verify new URL
4. Test with very long scenarios (many service periods, children, etc.)

---

## 🚀 Deployment Checklist

- [ ] Add `pako` dependency
- [ ] Create `scenarioEncoding.ts` utility
- [ ] Create `useURLState` hook
- [ ] Create `SaveShareModal` component
- [ ] Integrate with `FerexApp`
- [ ] Add "Save & Share" button to dashboard
- [ ] Test URL encoding/decoding
- [ ] Test with various scenario sizes
- [ ] Test URL sharing across devices
- [ ] Add analytics tracking for "save" events
- [ ] Mobile optimization for modal
- [ ] Add loading state while encoding
- [ ] Error handling for encoding failures

---

## 📈 Success Metrics

### Track:
- Number of "Save & Share" clicks per day
- Email capture rate (% who enter email)
- URL share rate (% who copy link)
- Return visits via shared URL
- Average scenario size (URL length)

### Goals:
- 30% of users click "Save & Share"
- 50% of those enter email
- 20% return via shared URL within 7 days

---

## 🔮 Future Enhancements

1. **URL Shortener Integration**
   - Integrate with bit.ly or custom shortener
   - Prettier URLs for sharing

2. **Email Notifications (Serverless)**
   - Reminder: "You planned to retire in 2028 - check your plan!"
   - Updates: "New COLA announced - see how it affects your plan"

3. **QR Code Generator**
   - Generate QR code for URL
   - Print and stick on desk/fridge

4. **Social Sharing Cards**
   - Open Graph meta tags
   - Twitter card with preview image
   - "I can retire at 57!" shareable graphic

5. **Collaborative Planning**
   - Share with spouse, both can edit
   - Real-time sync via WebRTC or Firebase

---

## 💡 Key Insights

**Why URL-based vs Database:**
- ✅ Zero infrastructure cost
- ✅ Works offline
- ✅ No GDPR concerns
- ✅ Instant deployment
- ✅ Can't be hacked (no database to breach)
- ✅ Users control their own data

**Compression Results:**
- Raw JSON: ~3-5 KB
- Gzip compressed: ~500-1000 bytes
- Base64 encoded: ~700-1400 characters
- **Still fits in URL** (browsers support 2000+ chars)

**Privacy Win:**
- No server-side storage = no data breach risk
- Email stays in localStorage only
- User can delete by clearing browser data
- GDPR compliant by design

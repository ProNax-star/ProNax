/**
 * Smoke test for copyright detection and fingerprint generation
 * This test verifies that the AudioContext fix works correctly
 */

import { AcousticFingerprinter, checkCopyrightViolation } from './copyrightDetection';

/**
 * Test 1: Verify AudioContext availability check
 */
export async function testAudioContextAvailability() {
  console.log('Test 1: AudioContext availability check');
  
  const hasAudioContext = typeof AudioContext !== 'undefined' || typeof (window as any).webkitAudioContext !== 'undefined';
  
  if (hasAudioContext) {
    console.log('✓ AudioContext is available on main thread');
    return true;
  } else {
    console.warn('✗ AudioContext is not available (expected in Web Workers)');
    return false;
  }
}

/**
 * Test 2: Generate fingerprint from a small audio file
 */
export async function testFingerprintGeneration() {
  console.log('Test 2: Fingerprint generation');
  
  try {
    // Create a small test audio file (1 second of silence)
    const sampleRate = 44100;
    const duration = 1;
    const numSamples = sampleRate * duration;
    const buffer = new Float32Array(numSamples);
    
    // Create a Blob from the buffer
    const audioBlob = new Blob([buffer], { type: 'audio/wav' });
    const testFile = new File([audioBlob], 'test-audio.wav', { type: 'audio/wav' });
    
    const fingerprinter = new AcousticFingerprinter();
    
    try {
      const result = await fingerprinter.generateFingerprint(testFile);
      
      console.log('✓ Fingerprint generated successfully:', {
        numHashes: result.fingerprints.length,
        duration: result.duration,
        sampleRate: result.sampleRate
      });
      
      fingerprinter.close();
      return true;
    } catch (error) {
      console.error('✗ Fingerprint generation failed:', error);
      fingerprinter.close();
      return false;
    }
  } catch (error) {
    console.error('✗ Test setup failed:', error);
    return false;
  }
}

/**
 * Test 3: Verify worker message types
 */
export async function testWorkerMessageTypes() {
  console.log('Test 3: Worker message types');
  
  try {
    const worker = new Worker(new URL('@/workers/copyrightDetection.worker.ts', import.meta.url), {
      type: 'module'
    });
    
    // Test compareFingerprints message
    const comparePromise = new Promise((resolve) => {
      const handleMessage = (e: MessageEvent) => {
        if (e.data.type === 'result') {
          worker.removeEventListener('message', handleMessage);
          resolve(e.data.data);
        }
      };
      
      worker.addEventListener('message', handleMessage);
      worker.postMessage({
        type: 'compareFingerprints',
        data: {
          fingerprints1: ['hash1', 'hash2', 'hash3'],
          fingerprints2: ['hash1', 'hash4', 'hash5']
        }
      });
    });
    
    const compareResult = await comparePromise;
    console.log('✓ Worker compareFingerprints works:', compareResult);
    
    // Test matchPartialSegments message
    const partialPromise = new Promise((resolve) => {
      const handleMessage = (e: MessageEvent) => {
        if (e.data.type === 'result') {
          worker.removeEventListener('message', handleMessage);
          resolve(e.data.data);
        }
      };
      
      worker.addEventListener('message', handleMessage);
      worker.postMessage({
        type: 'matchPartialSegments',
        data: {
          fingerprints1: ['hash1', 'hash2', 'hash3'],
          fingerprints2: ['hash1', 'hash4', 'hash5']
        }
      });
    });
    
    const partialResult = await partialPromise;
    console.log('✓ Worker matchPartialSegments works:', partialResult);
    
    worker.terminate();
    return true;
  } catch (error) {
    console.error('✗ Worker message test failed:', error);
    return false;
  }
}

/**
 * Test 4: Fingerprint generation success + worker comparison returns match
 */
export async function testFingerprintWithMatch() {
  console.log('Test 4: Fingerprint generation with worker match scenario');
  
  try {
    const worker = new Worker(new URL('@/workers/copyrightDetection.worker.ts', import.meta.url), {
      type: 'module'
    });
    
    // Simulate two identical fingerprint arrays (should return high match score)
    const identicalFingerprints = Array.from({ length: 100 }, (_, i) => `hash-${i}`);
    
    const comparison = await new Promise((resolve) => {
      const handleMessage = (e: MessageEvent) => {
        if (e.data.type === 'result') {
          worker.removeEventListener('message', handleMessage);
          resolve(e.data.data);
        }
      };
      
      worker.addEventListener('message', handleMessage);
      worker.postMessage({
        type: 'compareFingerprints',
        data: {
          fingerprints1: identicalFingerprints,
          fingerprints2: identicalFingerprints
        }
      });
    });
    
    console.log('✓ Worker comparison with identical fingerprints:', {
      matchScore: comparison.matchScore,
      matchingHashes: comparison.matchingHashes,
      totalHashes: comparison.totalHashes,
      isMatch: comparison.matchScore >= 0.75
    });
    
    // Verify match score is high for identical fingerprints
    if (comparison.matchScore >= 0.75) {
      console.log('✓ Match detection working correctly (identical fingerprints detected)');
      worker.terminate();
      return true;
    } else {
      console.warn('✗ Match detection failed (identical fingerprints not detected)');
      worker.terminate();
      return false;
    }
  } catch (error) {
    console.error('✗ Fingerprint with match test failed:', error);
    return false;
  }
}

/**
 * Run all smoke tests
 */
export async function runSmokeTests() {
  console.log('=== Copyright Detection Smoke Tests ===\n');
  
  const results = {
    audioContextAvailable: await testAudioContextAvailability(),
    fingerprintGeneration: await testFingerprintGeneration(),
    workerMessageTypes: await testWorkerMessageTypes(),
    fingerprintWithMatch: await testFingerprintWithMatch()
  };
  
  console.log('\n=== Test Results ===');
  console.log('AudioContext Available:', results.audioContextAvailable ? '✓' : '✗');
  console.log('Fingerprint Generation:', results.fingerprintGeneration ? '✓' : '✗');
  console.log('Worker Message Types:', results.workerMessageTypes ? '✓' : '✗');
  console.log('Fingerprint with Match:', results.fingerprintWithMatch ? '✓' : '✗');
  
  const allPassed = Object.values(results).every(r => r === true);
  console.log('\nOverall:', allPassed ? '✓ All tests passed' : '✗ Some tests failed');
  
  return allPassed;
}

// Export for manual testing in browser console
if (typeof window !== 'undefined') {
  (window as any).copyrightSmokeTests = {
    testAudioContextAvailability,
    testFingerprintGeneration,
    testWorkerMessageTypes,
    testFingerprintWithMatch,
    runSmokeTests
  };
  console.log('Smoke tests available at window.copyrightSmokeTests.runSmokeTests()');
}

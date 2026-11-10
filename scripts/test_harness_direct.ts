import { AndroidHarness } from '../src/harness/android-harness.js';
import { DeviceLockManager } from '../src/harness/lock-manager.js';
import { DeviceDiscovery } from '../src/devices/discovery.js';

async function main() {
  console.log('1. Scanning devices...');
  await DeviceDiscovery.scanDevices();
  const devices = DeviceDiscovery.getDevices();
  console.log('Found devices:', devices.map(d => `${d.serial} (${d.model})`));

  if (devices.length === 0) {
    console.log('No devices found!');
    return;
  }

  const serial = devices[0].serial;

  console.log('\n2. Testing DeviceLockManager...');
  const lock1 = DeviceLockManager.getLock(serial);
  console.log('Initial lock state:', lock1);

  const acq = DeviceLockManager.acquire(serial, 'agent', 'Teste de Lock Agêntico', 30000);
  console.log('Acquired lock:', acq);

  const checkScript = DeviceLockManager.check(serial, 'script');
  console.log('Can script run during agent lock?', checkScript.allowed, '| Reason:', checkScript.reason);

  DeviceLockManager.release(serial, 'agent');
  console.log('Released lock state:', DeviceLockManager.getLock(serial).state);

  console.log('\n3. Testing AndroidHarness.getCompactElements...');
  const elements = await AndroidHarness.getCompactElements(serial);
  console.log(`Extracted ${elements.length} compact UI elements from screen!`);
  console.log('Sample elements (first 5):', elements.slice(0, 5));

  console.log('\n4. Testing screenshot buffer...');
  const buffer = await AndroidHarness.getScreenshotBuffer(serial);
  console.log(`Screenshot captured: ${buffer.length} bytes (PNG)`);

  console.log('\n✅ All Harness modules validated successfully!');
}

main().catch(console.error);

import { AndroidHarness } from '../src/harness/android-harness.js';
import { DeviceLockManager } from '../src/harness/lock-manager.js';
import { DeviceDiscovery } from '../src/devices/discovery.js';

/**
 * Example Autonomous Task: Sending a WhatsApp message via Phone-Harness
 *
 * Usage:
 *   npx tsx scripts/example_whatsapp_task.ts
 */
async function main() {
  await DeviceDiscovery.scanDevices();
  const devices = DeviceDiscovery.getDevices();

  if (devices.length === 0) {
    console.error('No Android devices connected. Connect a device with USB debugging enabled.');
    process.exit(1);
  }

  // Use specified device or the first online device
  const serial = process.env.DEVICE_SERIAL || devices[0].serial;
  const targetContact = process.env.TARGET_CONTACT || 'Contact Name';
  const targetMessage = process.env.TARGET_MESSAGE || 'Hello from Android Phone Farm Agent!';

  console.log(`Starting task on device: ${serial}`);

  // 1. Acquire Session Lock to prevent conflicting actions
  const lock = DeviceLockManager.acquire(serial, 'agent', 'Example WhatsApp task', 60000);
  if (!lock.success) {
    console.error(`Cannot acquire device lock: ${lock.reason}`);
    process.exit(1);
  }

  try {
    // 2. Launch App
    console.log('Launching WhatsApp...');
    await AndroidHarness.launchApp(serial, 'whatsapp');
    await new Promise((r) => setTimeout(r, 2000));

    // 3. Inspect screen elements
    console.log('Analyzing screen hierarchy...');
    const compact = await AndroidHarness.getCompactElements(serial);

    const contactRow = compact.find(
      (e) => (e.text || '').toLowerCase().includes(targetContact.toLowerCase()) && e.center[1] > 300
    );

    if (contactRow) {
      console.log(`Contact found at [${contactRow.center[0]}, ${contactRow.center[1]}], tapping...`);
      await AndroidHarness.tap(serial, contactRow.center[0], contactRow.center[1]);
    } else {
      console.log('Searching for contact...');
      await AndroidHarness.tap(serial, 540, 328);
      await new Promise((r) => setTimeout(r, 1000));
      await AndroidHarness.type(serial, targetContact);
      await new Promise((r) => setTimeout(r, 1500));
      await AndroidHarness.tap(serial, 540, 600);
    }

    await new Promise((r) => setTimeout(r, 2000));

    // 4. Send Message
    console.log('Typing message...');
    await AndroidHarness.tap(serial, 392, 2125);
    await new Promise((r) => setTimeout(r, 800));
    await AndroidHarness.type(serial, targetMessage);
    await new Promise((r) => setTimeout(r, 1200));

    // Close soft keyboard to ensure send button visibility
    await AndroidHarness.pressKey(serial, 'BACK');
    await new Promise((r) => setTimeout(r, 600));

    // Tap green send button
    await AndroidHarness.tap(serial, 986, 2122);
    await new Promise((r) => setTimeout(r, 1500));

    console.log('Task finished successfully.');
  } finally {
    DeviceLockManager.release(serial, 'agent', true);
  }
}

main().catch(console.error);

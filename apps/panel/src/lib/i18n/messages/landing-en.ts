export const landingEn = {
  metaTitle: 'Filo — Bulk campaigns from multiple lines',
  metaDescription:
    'Connect your own lines, upload your contact list, and send bulk campaigns at line-safe speeds. Number verification, warm-up, and automatic pause included.',
  hero: {
    titleBefore: 'Send bulk campaigns,',
    titleAccent: 'keep your lines healthy.',
    lead: 'Connect lines via QR, upload your list, and compose your message. Sending runs in the background within real platform limits.',
    ctaPrimary: 'Contact us',
    ctaSecondary: 'See the product',
    trust: 'Accounts are provisioned by Filo · No self-signup',
    caption: 'Live panel tour — summary, lines, sending',
  },
  proof: [
    { label: 'Daily cap per line', detail: 'Sending aligned with platform quotas' },
    { label: 'Server-side sessions', detail: 'Stays connected when the panel is closed' },
    { label: 'Number verification', detail: 'No attempts to unregistered numbers' },
    { label: 'Tenant isolation', detail: 'Lines and messages stay per business' },
  ],
  capacity: {
    kicker: 'Capacity',
    title: 'First, the honest question: how many messages can you send per day?',
    lead: 'Most panels hide this until after you get access. We put it upfront — the right expectation protects you and your lines.',
  },
  calculator: {
    title: 'Capacity calculator',
    subtitle: 'Based on the same limits you will see in the panel.',
    badge: 'Up to 250 per line per day',
    linesLabel: 'How many lines will you connect?',
    targetLabel: 'How many people do you want to reach?',
    matureTitle: 'Daily ceiling (after warm-up)',
    matureHint: '{lines} lines × 250 msgs',
    daysTitle: 'Days to complete',
    daysHintOk: 'About {days} days',
    daysHintFail: 'Not feasible in a reasonable timeframe',
    curveTitle: 'How the daily cap grows per line',
    curveHint: 'A new line cannot send at full speed from day one; sudden volume is the most common reason for restrictions.',
    dayLabel: 'Day {n}',
    dayPlus: 'Day {n}+',
    msgUnit: 'msgs',
    curveFooter:
      'The only way to send faster is more lines. Pushing a single line past its daily ceiling leads to temporary locks, then permanent bans.',
  },
  problem: {
    kicker: 'Problem → solution',
    title: 'Where bulk messaging panels usually break down',
    lead: 'Filo focuses on keeping lines healthy, not just sending faster. Scroll to see the screen that addresses each problem.',
    solutionLabel: 'How Filo handles it',
    items: [
      {
        title: 'Speed that burns lines',
        body: 'Blasting thousands of messages at a fixed pace gets accounts restricted. “Unlimited sending” often means a ban waiting to happen.',
      },
      {
        title: 'Hitting unregistered numbers',
        body: 'Messaging numbers that are not on the platform raises both quota pressure and complaint risk.',
      },
      {
        title: 'Sending stops when the panel closes',
        body: 'If campaigns halt when your laptop is off, operations cannot scale.',
      },
      {
        title: 'Missing replies',
        body: 'When “interested” or “opt out” replies scatter, sales slip and compliance risk grows.',
      },
    ],
    solutions: [
      {
        title: 'Warm-up and random intervals',
        body: 'New lines ramp up gradually. Human-like delays between messages; quota visible live in the panel.',
        frame: 'Accounts · line quota',
      },
      {
        title: 'Verify before sending',
        body: 'List numbers are flagged as registered or not. Campaigns skip unregistered contacts.',
        frame: 'Contacts · number verification',
      },
      {
        title: 'Server-side engine',
        body: 'Sessions and campaigns run in the background. Sending continues even when the panel is closed.',
        frame: 'Status · live monitoring',
      },
      {
        title: 'Replies and blacklist',
        body: 'Read inbound replies in one place. One click to blacklist anyone who opts out.',
        frame: 'Blacklist · opt-out requests',
      },
    ],
  },
  how: {
    kicker: 'Flow',
    title: 'Go live in three steps',
    steps: [
      {
        n: '01',
        title: 'Connect your lines',
        body: 'Scan a QR code from the panel. Add as many lines as you need. Sessions live on the server and stay connected when the panel is closed.',
      },
      {
        n: '02',
        title: 'Upload contacts',
        body: 'Import a CSV or paste numbers. They are normalized to country format and checked for registration.',
      },
      {
        n: '03',
        title: 'Launch the campaign',
        body: 'Write the message, attach media, pick lines. Sending runs in the background — close the panel and it keeps going.',
      },
    ],
  },
  showcase: {
    kicker: 'Product',
    title: 'The campaign flow inside the panel',
    lead: 'Real panel screens. Sensitive numbers and chat text are masked with sample campaign data.',
    tabs: [
      {
        id: 'kampanyalar',
        label: 'Campaigns',
        lead: 'Pick list and lines, write the message. Sending runs in the background.',
        caption: 'Reports · campaign performance',
        alt: 'Filo reports and campaign summary screen',
      },
      {
        id: 'hesaplar',
        label: 'Accounts',
        lead: 'Connect multiple lines via QR and watch quota live.',
        caption: 'Accounts · multi-line',
        alt: 'Filo accounts screen — connected lines',
      },
      {
        id: 'ozet',
        label: 'Overview',
        lead: 'Daily ops view: lines, contact book, traffic, and shortcuts.',
        caption: 'Overview · workbench',
        alt: 'Filo overview panel',
      },
    ],
    cards: [{ label: 'Quick send' }, { label: 'Contacts' }, { label: 'Status' }],
  },
  day: {
    kicker: 'A day in ops',
    title: 'What does an operations day look like?',
    lead: 'From morning checks to evening reports — the campaign loop in one panel.',
    steps: [
      {
        time: '09:00',
        title: 'Check your lines',
        body: 'Connected lines, daily quota, and warm-up ceiling show on Overview. Reconnect any line waiting for QR from Accounts.',
      },
      {
        time: '10:30',
        title: 'Verify the list',
        body: 'Campaign list numbers are flagged as registered or not. Unregistered contacts are filtered out automatically.',
      },
      {
        time: '11:15',
        title: 'Start the campaign',
        body: 'Choose message, media, and lines. Sending runs on the server — it continues even if the panel is closed.',
      },
      {
        time: '14:00',
        title: 'Handle replies',
        body: 'Read inbound responses. Blacklisted numbers never receive another message.',
      },
      {
        time: '17:30',
        title: 'Review delivery and reads',
        body: 'Outbox and Reports show sent → delivered → read. Quota for the next day becomes clear.',
      },
    ],
  },
  safety: {
    kicker: 'Line protection',
    title: 'The real job is keeping the line alive, not just sending',
    lead: 'Bulk messaging is technically easy. The hard part is the line still working after the third campaign. Filo is built largely for that.',
    items: [
      {
        title: 'Number verification',
        body: 'Every number is checked before send. Attempting unregistered numbers is the fastest path to restrictions.',
      },
      {
        title: 'Real quota reading',
        body: 'We read your new-conversation quota and any temporary lock from the source and show it in the panel. No guessing.',
      },
      {
        title: 'Warm-up curve',
        body: 'A new line starts at 10 on day one, 120 in week one, then 250 per day. The panel cannot exceed this ceiling.',
      },
      {
        title: 'Human-like send intervals',
        body: 'Random delays between messages. Fixed-interval blasting is the easiest automation signature to detect.',
      },
      {
        title: 'Automatic pause',
        body: 'When a line signals restriction, that line pauses and others continue. The whole campaign does not collapse.',
      },
      {
        title: 'Blacklist',
        body: 'Opt-outs and manually flagged numbers are never included in any campaign again.',
      },
    ],
  },
  multi: {
    title: 'Scale capacity with more lines',
    lead: 'Pushing one line harder does not work. Connect multiple lines instead — Filo distributes the campaign, tracks each line’s quota separately, and keeps going on the others if one is restricted.',
    bullets: [
      'As many lines as you need from one panel',
      'Separate daily quota and live status per line',
      'Campaign continues when one line drops',
      'Sessions on the server — connected even when the panel is closed',
    ],
    chartTitle: 'Load split across three lines',
    lines: [{ name: 'Sales line' }, { name: 'Support line' }, { name: 'Campaign line' }],
    chartNote:
      'The third line is still warming up, so its ceiling is lower. The campaign still moves at 620 messages per day.',
  },
  wall: {
    kicker: 'From the field',
    title: 'Notes from ops teams',
    lead: 'Teams that connect lines, verify lists, and leave campaigns running on the server.',
    quotes: [
      {
        quote:
          'We connected three lines in the morning and closed the panel after lunch. By evening the campaign had kept moving on its own — our old tool needed the laptop left open.',
        name: 'Ege Yılmaz',
        role: 'Operations manager, retail chain',
      },
      {
        quote:
          'Sending before verifying numbers got us restricted. Now unregistered contacts are filtered out; complaints dropped and the daily quota lasts.',
        name: 'Selin Aksoy',
        role: 'Marketing lead, services group',
      },
      {
        quote:
          'Anyone who replies “stop” goes on the blacklist in one click. We don’t message them again, and we don’t miss inbound replies.',
        name: 'Murat Demir',
        role: 'Sales team lead, B2B distribution',
      },
      {
        quote:
          'New lines start with a lower ceiling — it’s written in the panel, no guessing. After about a week they settle into normal pace.',
        name: 'Deniz Kara',
        role: 'Founder, digital agency',
      },
    ],
  },
  pricing: {
    title: 'No per-message fees',
    lead: 'Panels on the official API bill every marketing conversation separately. We use your own lines, so cost stays fixed beyond the plan. Plans differ only by line count and daily capacity. Prices are informational; billing is configured in Settings.',
    recommended: 'Recommended',
    accounts: '{n} lines',
    daily: {
      free: '50 messages per day',
      starter: '~750 messages per day',
      pro: '~2,500 messages per day',
      enterprise: '~12,500 messages per day',
    },
    monthlyQuota: '{n} messages per month',
    features: {
      free: ['No credit card required', 'Full feature access', 'Cancel anytime'],
      starter: ['Unlimited contact lists', 'Live campaign tracking', 'Number verification'],
      pro: [
        'Image generator included',
        'Unlimited contact lists',
        'Live campaign tracking',
        'Priority support',
      ],
      enterprise: ['Multi-client management', 'Per-brand kit templates', 'Detailed reporting'],
    },
    cta: 'Contact us',
    price: {
      free: '0 TL',
      starter: '890 TL',
      pro: '1.290 TL',
      enterprise: '3.490 TL',
    },
    note: {
      free: '7 days',
      starter: 'per month',
      pro: 'per month',
      enterprise: 'per month',
    },
    planLabels: {
      free: 'Trial',
      starter: 'Starter',
      pro: 'Growth',
      enterprise: 'Agency',
    },
  },
  faq: {
    title: 'Frequently asked questions',
    items: [
      {
        q: 'Will my account get banned?',
        a: 'Risk is not zero — we do not pretend otherwise. Messages go out from your own lines. We manage risk: verify numbers upfront, read your real quota, warm new lines gradually, randomize intervals, and pause at the first restriction signal. Accounts that push quota or spam irrelevant lists can still be blocked.',
      },
      {
        q: 'Can I really send to unlimited numbers?',
        a: 'On the list side, yes — upload as many as you need. On speed, no — one line sends at most 250 messages per day. That is a platform limit, not ours. Reaching 10,000 people takes about two weeks with 3 lines or one day with 40. Any panel promising “unlimited sending” either does not understand this or accepts burning your lines.',
      },
      {
        q: 'How is this different from the official API?',
        a: 'With the official API you pay Meta per marketing conversation and templates need pre-approval — in return, accounts are safer. With us there is no per-message fee or template approval; cost is fixed and risk sits on your lines. At very high volume with major brand risk, the official API may be the better fit.',
      },
      {
        q: 'What about compliance (KVKK / GDPR)?',
        a: 'Sending commercial messages without consent carries legal risk; responsibility stays with the sender. The panel provides blacklist and logging for opt-outs, but using permission-based lists is your obligation.',
      },
      {
        q: 'Does sending stop if I close my computer?',
        a: 'No. Sessions and the campaign engine run on the server. You open the panel to monitor and manage. Close it and sending continues; reopen to see live status.',
      },
      {
        q: 'What happens if a line gets restricted?',
        a: 'That line pauses automatically and shows the lock reason in the panel. If a campaign is running, others continue. Temporary locks clear on their own when the period ends.',
      },
    ],
  },
  final: {
    title: 'Let’s open Filo for your business',
    lead: 'Accounts are created only by Filo. Contact us and we’ll send your login details.',
    ctaPrimary: 'Contact us',
    ctaSecondary: 'See the product',
    hasAccount: 'Already have an account?',
    signIn: 'Sign in',
  },
  stickyCta: 'Contact us',
  scrollTop: 'Back to top',
}

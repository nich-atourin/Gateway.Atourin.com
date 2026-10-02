export function defaultConfig() {
  return {
    rev: 0,
    updatedAt: null,
    settings: {
      eventsTitle: 'Event Berlangsung',
      gatewayTitle: 'Elevate your event with',
      emptyText: 'Belum ada event yang tersedia saat ini. Pantau terus ya!',
      footer: '© 2026 Atourin. All Rights Reserved',
      utcOffset: '+07:00',
    },
    buttons: [
      { id: 'btn-web', active: true, label: 'Website', url: 'https://atourin.com', icon: 'website', iconUrl: '' },
      { id: 'btn-wa', active: true, label: 'WhatsApp', url: 'https://wa.me/6281234567890', icon: 'whatsapp', iconUrl: '' },
      { id: 'btn-ig', active: true, label: 'Instagram', url: 'https://instagram.com/atourin.id', icon: 'instagram', iconUrl: '' },
      { id: 'btn-th', active: true, label: 'Threads', url: 'https://threads.net/@atourin.id', icon: 'threads', iconUrl: '' },
    ],
    events: [],
    gateway: [
      {
        id: 'gw-registry', active: true, color: 'purple', icon: 'registry', iconUrl: '',
        title: 'Event Partner Registry',
        desc: 'Daftarkan event Anda dan mulai kelola tiket, peserta, hingga laporan dalam satu platform.',
        cta: 'Mulai onboarding', url: '',
      },
      {
        id: 'gw-booth', active: true, color: 'coral', icon: 'booth', iconUrl: '',
        title: 'Atourin Booth Booking System',
        desc: 'Amankan booth pameran Anda lebih awal di event-event Atourin mendatang.',
        cta: 'Booking sekarang', url: '',
      },
      {
        id: 'gw-acms', active: true, color: 'yellow', icon: 'shield', iconUrl: '',
        title: 'Atourin Crowd Management System',
        desc: 'Sistem akses & manajemen kerumunan real-time untuk keamanan event Anda.',
        cta: 'Pelajari ACMS', url: '',
      },
    ],
  };
}

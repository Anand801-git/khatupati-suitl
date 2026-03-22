import { Metadata } from 'next'
 
export default function icons(): Metadata['icons'] {
  return {
    icon: '/icon-192.png',
    apple: [
      { url: '/apple-touch-icon.png', sizes: '180x180', type: 'image/png' },
    ],
  }
}

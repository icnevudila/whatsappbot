import { notFound } from 'next/navigation';
import ReviewShell from './review-shell';
import './visual-lab.css';
import './v2.css';
import './signature-v3.css';

export default function VisualLab() {
  if (process.env.NODE_ENV === 'production') notFound();
  return <ReviewShell />;
}

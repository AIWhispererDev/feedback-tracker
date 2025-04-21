"use client"

import { useEffect, useState } from 'react';
import { Accordion, AccordionItem, AccordionTrigger, AccordionContent } from '@/components/ui/accordion';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';

// Helper to fetch the JSON data (works for Next.js API or static import)
const fetchFeedbackData = async () => {
  const res = await fetch('/data/discord_feedback.json');
  if (!res.ok) throw new Error('Failed to load feedback data');
  return res.json();
};

const DiscordFeedback: React.FC = () => {
  const [feedback, setFeedback] = useState<Record<string, { text: string; author: string }[]>>({});
  const [search, setSearch] = useState('');

  useEffect(() => {
    fetchFeedbackData().then(setFeedback).catch(console.error);
  }, []);

  // Filtered feedback by search
  const filtered = Object.fromEntries(
    Object.entries(feedback).map(([cat, items]) => [
      cat,
      items.filter(
        item =>
          item.text.toLowerCase().includes(search.toLowerCase()) ||
          item.author.toLowerCase().includes(search.toLowerCase())
      ),
    ])
  );

  return (
    <div>
      <h1 className="text-2xl font-bold mb-4">Discord Logs</h1>
      <Input
        placeholder="Search feedback..."
        value={search}
        onChange={e => setSearch(e.target.value)}
        className="mb-4 max-w-sm"
      />
      <Accordion type="multiple" className="space-y-4">
        {Object.entries(filtered).map(([cat, items]) => (
          <AccordionItem key={cat} value={cat}>
            <AccordionTrigger>{cat} ({items.length})</AccordionTrigger>
            <AccordionContent>
              <ul className="space-y-2">
                {items.map((item, idx) => (
                  <li key={idx} className="flex items-start space-x-2">
                    <Badge variant="outline" title={item.author}>{item.author}</Badge>
                    <span>{item.text}</span>
                  </li>
                ))}
              </ul>
            </AccordionContent>
          </AccordionItem>
        ))}
      </Accordion>
    </div>
  );
};

export default DiscordFeedback;

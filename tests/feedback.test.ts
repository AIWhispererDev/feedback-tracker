import { describe, it, expect } from 'vitest'
import { feedbackSchema } from '../app/actions/feedback'
import sanitizeHtml from 'sanitize-html'

describe('Feedback Input Validation', () => {
  it('accepts valid input', () => {
    const input = { title: 'Test Title', description: 'Valid description', category: 'general' }
    const result = feedbackSchema.safeParse(input)
    expect(result.success).toBe(true)
  })

  it('rejects empty title', () => {
    const input = { title: '', description: 'Some description', category: 'bug' }
    const result = feedbackSchema.safeParse(input)
    expect(result.success).toBe(false)
  })

  it('rejects too long description', () => {
    const longDesc = 'a'.repeat(2001)
    const input = { title: 'Title', description: longDesc, category: 'feature' }
    const result = feedbackSchema.safeParse(input)
    expect(result.success).toBe(false)
  })
})

describe('HTML Sanitization', () => {
  it('strips disallowed HTML tags', () => {
    const dirty = '<script>alert(1)</script><p>Hello <strong>World</strong></p>'
    const clean = sanitizeHtml(dirty, { allowedTags: [], allowedAttributes: {} })
    expect(clean).toBe('alert(1)Hello World')
  })
})

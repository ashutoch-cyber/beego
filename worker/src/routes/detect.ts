import { Hono } from 'hono'
import type { Env } from '../index'

const app = new Hono<{ Bindings: Env }>()

// Food detection using Hugging Face Inference API
// Using microsoft/swinv2-base-patch4-window8-256 for general image classification
// Fallback to food-specific models if available
app.post('/', async (c) => {
  const { imageUrl } = await c.req.json()

  if (!imageUrl) {
    return c.json({ message: 'No image URL provided' }, 400)
  }

  try {
    // Try Hugging Face Inference API with a food classification model
    // Using nateraw/food for food-specific classification
    const hfResponse = await fetch(
      'https://api-inference.huggingface.co/models/nateraw/food',
      {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${c.env.HUGGINGFACE_API_KEY}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          inputs: imageUrl,
        }),
      }
    )

    if (!hfResponse.ok) {
      // Fallback to a general image classification model
      const fallbackResponse = await fetch(
        'https://api-inference.huggingface.co/models/microsoft/swinv2-base-patch4-window8-256',
        {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${c.env.HUGGINGFACE_API_KEY}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            inputs: imageUrl,
          }),
        }
      )

      if (!fallbackResponse.ok) {
        throw new Error('AI detection failed')
      }

      const fallbackResult = await fallbackResponse.json()
      // Extract top prediction
      const predictions = Array.isArray(fallbackResult) ? fallbackResult[0] : fallbackResult
      const topPrediction = Array.isArray(predictions) ? predictions[0] : predictions

      return c.json({
        label: topPrediction?.label || 'unknown food',
        score: topPrediction?.score || 0.5,
        source: 'fallback',
      })
    }

    const result = await hfResponse.json()
    const predictions = Array.isArray(result) ? result[0] : result
    const topPrediction = Array.isArray(predictions) ? predictions[0] : predictions

    return c.json({
      label: topPrediction?.label || 'unknown food',
      score: topPrediction?.score || 0.5,
      source: 'huggingface',
    })
  } catch (error) {
    console.error('Detection error:', error)
    return c.json({
      label: 'unknown food',
      score: 0,
      source: 'error',
      error: 'AI detection failed. Please enter food manually.',
    }, 500)
  }
})

export { app as detectRoutes }

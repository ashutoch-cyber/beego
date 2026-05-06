import { Hono } from 'hono'
import type { Env } from '../index'

const app = new Hono<{ Bindings: Env }>()

app.post('/', async (c) => {
  const formData = await c.req.formData()
  const image = formData.get('image') as File

  if (!image) {
    return c.json({ message: 'No image provided' }, 400)
  }

  if (!image.type.startsWith('image/')) {
    return c.json({ message: 'File must be an image' }, 400)
  }

  if (image.size > 5 * 1024 * 1024) {
    return c.json({ message: 'Image must be under 5MB' }, 400)
  }

  const timestamp = Date.now()
  const random = Math.random().toString(36).substring(2, 10)
  const extension = image.name.split('.').pop() || 'jpg'
  const key = `uploads/${timestamp}-${random}.${extension}`

  await c.env.IMAGES.put(key, image.stream(), {
    httpMetadata: {
      contentType: image.type,
    },
  })

  const imageUrl = `${c.req.url.split('/api')[0]}/images/${key}`

  return c.json({ imageUrl, key })
})

export { app as uploadRoutes }

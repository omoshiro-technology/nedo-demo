import type { TopicData } from "./types"

export interface P5IslandMapOptions {
  container_width: number
  container_height: number
  background_color: string
  topics: TopicData[]
  hover_callback?: (topic: TopicData | null) => void
  click_callback?: (topic: TopicData | null) => void
}

interface IslandTransformParams {
  ellipse_ratio_x: number
  ellipse_ratio_y: number
  skew_x: number
  skew_y: number
  rotation: number
  bend_strength: number
  bend_direction: number
  twist_strength: number
}

// p5.jsをCDNから読み込む関数
function loadP5Script(): Promise<any> {
  return new Promise((resolve, reject) => {
    // 既にp5が読み込まれている場合
    if (typeof window !== "undefined" && (window as any).p5) {
      resolve((window as any).p5)
      return
    }

    // スクリプトタグを作成してp5.jsを読み込む
    const script = document.createElement("script")
    script.src = "https://cdnjs.cloudflare.com/ajax/libs/p5.js/1.7.0/p5.min.js"
    script.onload = () => {
      if ((window as any).p5) {
        resolve((window as any).p5)
      } else {
        reject(new Error("p5.js failed to load"))
      }
    }
    script.onerror = () => reject(new Error("Failed to load p5.js"))
    document.head.appendChild(script)
  })
}

export class P5IslandMap {
  public p5Instance: any = null
  private options: P5IslandMapOptions
  private hoverAnimations = new Map<string, number>()
  private zoom = 1.0
  private pan = { x: 0, y: 0 }
  private isDragging = false
  private dragStart = { x: 0, y: 0 }

  constructor(options: P5IslandMapOptions) {
    this.options = options
    console.log("[P5IslandMap] Constructor called with options:", options)
  }

  async createInstance(containerElement: HTMLElement): Promise<void> {
    if (this.p5Instance) this.p5Instance.remove()
    console.log("[P5IslandMap] Creating instance in container:", containerElement)

    try {
      const p5 = await loadP5Script()
      this.p5Instance = new p5(this.createSketch(), containerElement)
    } catch (error) {
      console.error("[P5IslandMap] Failed to load p5.js:", error)
      throw error
    }
  }

  destroy(): void {
    if (this.p5Instance) {
      console.log("[P5IslandMap] Destroying p5 instance.")
      this.p5Instance.remove()
      this.p5Instance = null
    }
  }

  updateOptions(newOptions: Partial<P5IslandMapOptions>): void {
    console.log("[P5IslandMap] Updating options:", newOptions)
    const oldTopicCount = this.options.topics?.length || 0
    Object.assign(this.options, newOptions)
    if (this.p5Instance) {
      if (newOptions.container_width !== undefined || newOptions.container_height !== undefined) {
        console.log(`[P5IslandMap] Resizing canvas to ${this.options.container_width}x${this.options.container_height}`)
        this.p5Instance.resizeCanvas(this.options.container_width, this.options.container_height)
      }
      // If topics have been added or changed, trigger a redraw.
      if (newOptions.topics && newOptions.topics.length !== oldTopicCount) {
        console.log(
          `[P5IslandMap] Topics updated from ${oldTopicCount} to ${newOptions.topics.length}. Triggering redraw.`,
        )
        this.p5Instance.loop()
      }
    }
  }

  public zoomIn(): void {
    this.zoom *= 1.2
    this.p5Instance?.loop()
  }

  public zoomOut(): void {
    this.zoom /= 1.2
    this.p5Instance?.loop()
  }

  public resetView(): void {
    console.log("[P5IslandMap] Resetting view.")
    this.fitView()
  }

  public fitView(): void {
    if (!this.p5Instance || !this.options.topics) {
      console.log("[P5IslandMap] fitView skipped: no p5 instance or topics.")
      return
    }
    if (this.options.topics.length === 0) {
      console.log("[P5IslandMap] fitView: No topics, resetting to default view.")
      this.zoom = 1.0
      this.pan = { x: 0, y: 0 }
      this.p5Instance?.loop() // Redraw with default view
      return
    }

    console.log(`[P5IslandMap] Fitting view for ${this.options.topics.length} topics.`)
    const p = this.p5Instance
    let minX = Number.POSITIVE_INFINITY,
      maxX = Number.NEGATIVE_INFINITY,
      minY = Number.POSITIVE_INFINITY,
      maxY = Number.NEGATIVE_INFINITY

    this.options.topics.forEach((topic) => {
      const x = (topic.x / 100) * p.width
      const y = (topic.y / 100) * p.height
      const radius = Math.max(20, topic.size * 60) * 4 // Use the largest layer for bounding box

      minX = Math.min(minX, x - radius)
      maxX = Math.max(maxX, x + radius)
      minY = Math.min(minY, y - radius)
      maxY = Math.max(maxY, y + radius)
    })

    const boundsWidth = maxX - minX
    const boundsHeight = maxY - minY
    console.log(`[P5IslandMap] Bounds calculated: w=${boundsWidth}, h=${boundsHeight}`)

    // Use a small threshold instead of === 0 to handle floating point inaccuracies
    if (boundsWidth <= 1 || boundsHeight <= 1) {
      console.log("[P5IslandMap] fitView: Single topic or zero-dimension bounds detected.")
      if (this.options.topics.length > 0) {
        const singleTopic = this.options.topics[0]
        const topicX = (singleTopic.x / 100) * p.width
        const topicY = (singleTopic.y / 100) * p.height

        this.zoom = 1.5
        this.pan.x = p.width / 2 - topicX * this.zoom
        this.pan.y = p.height / 2 - topicY * this.zoom
        console.log(`[P5IslandMap] Centering on single topic at (${topicX}, ${topicY}) with zoom ${this.zoom}`)
      }
    } else {
      const zoomX = p.width / boundsWidth
      const zoomY = p.height / boundsHeight
      this.zoom = Math.min(zoomX, zoomY) * 0.9

      const centerX = minX + boundsWidth / 2
      const centerY = minY + boundsHeight / 2

      this.pan.x = p.width / 2 - centerX * this.zoom
      this.pan.y = p.height / 2 - centerY * this.zoom
      console.log(`[P5IslandMap] View fitted. Zoom: ${this.zoom}, Pan:`, this.pan)
    }
    this.p5Instance?.loop() // Ensure redraw after fitting view
  }

  public pause(): void {
    if (this.p5Instance) {
      console.log("[P5IslandMap] Pausing draw loop.")
      this.p5Instance.noLoop()
    }
  }

  public resume(): void {
    if (this.p5Instance) {
      console.log("[P5IslandMap] Resuming draw loop.")
      this.p5Instance.loop()
    }
  }

  private createSketch() {
    return (p: any) => {
      let currentHoverTopic: TopicData | null = null
      let dragStartPos = { x: 0, y: 0 }
      let pressTime = 0
      const CLICK_THRESHOLD_SQUARED = 25 // 5px * 5px
      const CLICK_TIME_THRESHOLD = 250 // 250ms

      p.setup = () => {
        p.createCanvas(this.options.container_width, this.options.container_height)
        p.noiseSeed(42)
        console.log(`[P5Sketch] Setup complete. Canvas size: ${p.width}x${p.height}`)
        p.noLoop()
      }

      p.draw = () => {
        console.log(
          `[P5Sketch] Draw cycle started. Topics: ${this.options.topics?.length || 0}, Zoom: ${this.zoom.toFixed(2)}`,
        )
        p.background(this.options.background_color || "#d9e3ed")
        if (!this.options.topics || this.options.topics.length === 0) {
          console.log("[P5Sketch] No topics to draw. Exiting draw cycle.")
          p.noLoop() // Stop drawing if there's nothing to draw
          return
        }

        p.push()
        p.translate(this.pan.x, this.pan.y)
        p.scale(this.zoom)

        const worldMouseX = (p.mouseX - this.pan.x) / this.zoom
        const worldMouseY = (p.mouseY - this.pan.y) / this.zoom

        if (!this.isDragging) {
          const hoveredTopic = this.checkHover(p, this.options.topics, worldMouseX, worldMouseY)
          if (hoveredTopic !== currentHoverTopic) {
            currentHoverTopic = hoveredTopic
            if (this.options.hover_callback) this.options.hover_callback(hoveredTopic)
          }
        }

        const topicData = this.preprocessTopics(p, currentHoverTopic)
        this.drawLayers(p, topicData)
        p.pop()

        // After drawing, if no interaction is happening, stop the loop.
        if (!this.isDragging && !p.mouseIsPressed) {
          p.noLoop()
          console.log("[P5Sketch] Draw cycle finished. Stopping loop.")
        }
      }

      p.mousePressed = () => {
        if (p.mouseX > 0 && p.mouseX < p.width && p.mouseY > 0 && p.mouseY < p.height) {
          this.isDragging = false
          this.dragStart.x = p.mouseX - this.pan.x
          this.dragStart.y = p.mouseY - this.pan.y
          dragStartPos = { x: p.mouseX, y: p.mouseY }
          pressTime = p.millis()
          console.log("[P5Sketch] Mouse pressed. Starting loop.")
          p.loop()
        }
      }

      p.mouseDragged = () => {
        const distSq = (p.mouseX - dragStartPos.x) ** 2 + (p.mouseY - dragStartPos.y) ** 2
        if (distSq > CLICK_THRESHOLD_SQUARED) {
          this.isDragging = true
        }

        if (this.isDragging) {
          this.pan.x = p.mouseX - this.dragStart.x
          this.pan.y = p.mouseY - this.dragStart.y
          // loop() is already active from mousePressed
        }
      }

      p.mouseReleased = () => {
        if (!this.isDragging) {
          const timeElapsed = p.millis() - pressTime
          if (timeElapsed < CLICK_TIME_THRESHOLD) {
            if (this.options.click_callback) {
              const worldMouseX = (p.mouseX - this.pan.x) / this.zoom
              const worldMouseY = (p.mouseY - this.pan.y) / this.zoom
              const clickedTopic = this.checkHover(p, this.options.topics, worldMouseX, worldMouseY)
              this.options.click_callback(clickedTopic)
            }
          }
        }
        this.isDragging = false
        console.log("[P5Sketch] Mouse released. Stopping loop.")
        p.noLoop()
      }

      p.mouseMoved = () => {
        if (!this.isDragging && p.mouseX > 0 && p.mouseX < p.width && p.mouseY > 0 && p.mouseY < p.height) {
          // Only loop if there's a hover change to be animated
          const worldMouseX = (p.mouseX - this.pan.x) / this.zoom
          const worldMouseY = (p.mouseY - this.pan.y) / this.zoom
          const hoveredTopic = this.checkHover(p, this.options.topics, worldMouseX, worldMouseY)
          if (hoveredTopic !== currentHoverTopic) {
            p.loop()
          }
        }
      }
    }
  }

  private preprocessTopics(p: any, hoveredTopic: TopicData | null): any[] {
    return this.options.topics.map((topic) => {
      const x = (topic.x / 100) * p.width
      const y = (topic.y / 100) * p.height
      const baseRadius = Math.max(20, topic.size * 60)

      if (!this.hoverAnimations.has(topic.name)) this.hoverAnimations.set(topic.name, 0)
      let currentAnimation = this.hoverAnimations.get(topic.name) || 0
      currentAnimation = p.lerp(currentAnimation, hoveredTopic === topic ? 1 : 0, 0.15)
      this.hoverAnimations.set(topic.name, currentAnimation)

      const scaleFactor = 1 + currentAnimation * 0.05
      const radius = baseRadius * scaleFactor
      return { topic, x, y, radius }
    })
  }

  private drawLayers(p: any, topicData: any[]): void {
    const layers = [
      { mult: 4, color: "#ececec", dist: 0.05 },
      { mult: 3, color: "#d8e2ee", dist: 0.08 },
      { mult: 2, color: "#c4d5ed", dist: 0.12 },
    ]
    layers.forEach((layer) => {
      this.drawLayerConnections(p, topicData, layer.mult, layer.color, 0.015 * layer.mult)
      topicData.forEach(({ topic, x, y, radius }) => {
        this.drawIslandLayer(p, x, y, radius * layer.mult, topic, layer.color, layer.dist)
      })
    })

    this.drawLayerConnections(p, topicData, 1, "#b1caea", 0.01)
    topicData.forEach(({ topic, x, y, radius }) => {
      this.drawIsland(p, x, y, radius, topic)
      this.drawTopicLabel(p, x, y, topic)
    })
  }

  private getIslandTransformParams(topic: TopicData): IslandTransformParams {
    let hash = 0
    for (let i = 0; i < topic.name.length; i++) {
      hash = (hash << 5) - hash + topic.name.charCodeAt(i)
      hash |= 0
    }
    const seed = (Math.abs(hash) / 2147483647 + topic.importance) / 2
    return {
      ellipse_ratio_x: 0.85 + seed * 0.3,
      ellipse_ratio_y: 0.85 + ((seed * 0.3 + 0.2) % 1) * 0.3,
      skew_x: (seed * 0.4 - 0.2) * 0.1,
      skew_y: ((seed * 0.7 + 0.3) % 1) * 0.4 - 0.2,
      rotation: seed * Math.PI * 2,
      bend_strength: seed * 0.05,
      bend_direction: ((seed * 0.9 + 0.1) % 1) * Math.PI * 2,
      twist_strength: (seed * 0.3 - 0.15) * 0.05,
    }
  }

  private drawDistortedCircle(p: any, x: number, y: number, radius: number, topic: TopicData, distortion = 0.5): void {
    const transform = this.getIslandTransformParams(topic)
    // Generate a unique noise offset per topic so each island has a distinct coastline
    let hash = 0
    for (let i = 0; i < topic.name.length; i++) {
      hash = (hash << 5) - hash + topic.name.charCodeAt(i)
      hash |= 0
    }
    const offsetX = (Math.abs(hash) % 10000)
    const offsetY = (Math.abs(hash * 7 + 13) % 10000)

    p.push()
    p.translate(x, y)
    p.rotate(transform.rotation)
    p.beginShape()
    const points = 80
    for (let i = 0; i <= points; i++) {
      const angle = (i / points) * Math.PI * 2
      const baseX = p.cos(angle) * radius * transform.ellipse_ratio_x
      const baseY = p.sin(angle) * radius * transform.ellipse_ratio_y
      // Multi-octave noise for natural coastline shapes
      const nx = offsetX + p.cos(angle) * 2
      const ny = offsetY + p.sin(angle) * 2
      const noise1 = p.noise(nx, ny)
      const noise2 = p.noise(nx * 3, ny * 3) * 0.4
      const noise3 = p.noise(nx * 7, ny * 7) * 0.15
      const combinedNoise = noise1 + noise2 + noise3
      const noiseFactor = 1 + (combinedNoise - 0.5 * 1.55) * distortion
      p.vertex(baseX * noiseFactor, baseY * noiseFactor)
    }
    p.endShape(p.CLOSE)
    p.pop()
  }

  private drawIslandLayer(
    p: any,
    x: number,
    y: number,
    radius: number,
    topic: TopicData,
    color: string,
    distortion: number,
  ): void {
    p.push()
    p.fill(color)
    p.noStroke()
    this.drawDistortedCircle(p, x, y, radius, topic, distortion)
    p.pop()
  }

  private drawIsland(p: any, x: number, y: number, radius: number, topic: TopicData): void {
    p.push()
    p.fill("#b1caea")
    p.noStroke()
    this.drawDistortedCircle(p, x, y, radius, topic, 0.15)
    p.pop()
  }

  private drawTopicLabel(p: any, x: number, y: number, topic: TopicData): void {
    p.push()
    p.textAlign(p.CENTER, p.CENTER)
    p.textSize(12)
    p.textStyle(p.BOLD)
    const textWidth = p.textWidth(topic.name)
    p.fill(255, 255, 255, 150)
    p.noStroke()
    p.rect(x - textWidth / 2 - 4, y - 8, textWidth + 8, 16, 4)
    p.fill(0, 0, 0, 200)
    p.text(topic.name, x, y)
    p.pop()
  }

  private drawLayerConnections(
    p: any,
    topicData: any[],
    layerMultiplier: number,
    color: string,
    connectionThresholdRatio: number,
  ): void {
    const canvasDiagonal = Math.sqrt(p.width * p.width + p.height * p.height)
    const connectionThreshold = canvasDiagonal * connectionThresholdRatio
    for (let i = 0; i < topicData.length; i++) {
      for (let j = i + 1; j < topicData.length; j++) {
        const island1 = topicData[i]
        const island2 = topicData[j]
        const dx = island2.x - island1.x
        const dy = island2.y - island1.y
        const distance = Math.sqrt(dx * dx + dy * dy)
        const combinedRadius = (island1.radius + island2.radius) * layerMultiplier
        if (distance - combinedRadius < connectionThreshold) {
          p.push()
          p.stroke(color)
          p.strokeWeight(Math.max(1, 8 - layerMultiplier * 2))
          p.line(island1.x, island1.y, island2.x, island2.y)
          p.pop()
        }
      }
    }
  }

  private checkHover(p: any, topics: TopicData[], worldMouseX: number, worldMouseY: number): TopicData | null {
    for (const topic of [...topics].reverse()) {
      const x = (topic.x / 100) * p.width
      const y = (topic.y / 100) * p.height
      const radius = Math.max(20, topic.size * 60)
      if (p.dist(worldMouseX, worldMouseY, x, y) <= radius) return topic
    }
    return null
  }
}

import React, { useEffect, useRef, useState, useCallback } from 'react'
import { Sword, Shield, Zap, Heart } from 'lucide-react'

interface Fighter {
  id: number
  x: number
  y: number
  width: number
  height: number
  velocityX: number
  velocityY: number
  health: number
  maxHealth: number
  energy: number
  maxEnergy: number
  facing: 'left' | 'right'
  state: 'idle' | 'walking' | 'jumping' | 'attacking' | 'blocking' | 'hit' | 'special'
  color: string
  name: string
  isGrounded: boolean
  attackCooldown: number
  specialCooldown: number
  hitStun: number
  blockStun: number
  combo: number
  animationFrame: number
  animationTimer: number
}

interface Projectile {
  id: number
  x: number
  y: number
  velocityX: number
  velocityY: number
  damage: number
  owner: number
  type: 'fireball' | 'ice' | 'lightning'
  color: string
  animationFrame: number
}

interface Particle {
  id: number
  x: number
  y: number
  velocityX: number
  velocityY: number
  life: number
  maxLife: number
  color: string
  size: number
}

const CANVAS_WIDTH = 1200
const CANVAS_HEIGHT = 600
const GROUND_Y = 500
const GRAVITY = 0.8
const JUMP_FORCE = -18
const MOVE_SPEED = 1.2 // Reduced from 2.5 to 1.2 for much smoother movement
const ATTACK_DAMAGE = 15
const SPECIAL_DAMAGE = 25

function App() {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const animationRef = useRef<number>()
  const keysRef = useRef<Set<string>>(new Set())
  
  const [gameState, setGameState] = useState<'menu' | 'playing' | 'paused' | 'gameOver'>('menu')
  const [winner, setWinner] = useState<string | null>(null)
  const [fighters, setFighters] = useState<Fighter[]>([])
  const [projectiles, setProjectiles] = useState<Projectile[]>([])
  const [particles, setParticles] = useState<Particle[]>([])
  const [round, setRound] = useState(1)
  const [scores, setScores] = useState({ player1: 0, player2: 0 })

  const initializeFighters = useCallback(() => {
    const fighter1: Fighter = {
      id: 1,
      x: 200,
      y: GROUND_Y - 80,
      width: 60,
      height: 80,
      velocityX: 0,
      velocityY: 0,
      health: 100,
      maxHealth: 100,
      energy: 100,
      maxEnergy: 100,
      facing: 'right',
      state: 'idle',
      color: '#3B82F6',
      name: 'Sub-Zero',
      isGrounded: true,
      attackCooldown: 0,
      specialCooldown: 0,
      hitStun: 0,
      blockStun: 0,
      combo: 0,
      animationFrame: 0,
      animationTimer: 0
    }

    const fighter2: Fighter = {
      id: 2,
      x: CANVAS_WIDTH - 260,
      y: GROUND_Y - 80,
      width: 60,
      height: 80,
      velocityX: 0,
      velocityY: 0,
      health: 100,
      maxHealth: 100,
      energy: 100,
      maxEnergy: 100,
      facing: 'left',
      state: 'idle',
      color: '#EF4444',
      name: 'Scorpion',
      isGrounded: true,
      attackCooldown: 0,
      specialCooldown: 0,
      hitStun: 0,
      blockStun: 0,
      combo: 0,
      animationFrame: 0,
      animationTimer: 0
    }

    setFighters([fighter1, fighter2])
    setProjectiles([])
    setParticles([])
    setWinner(null)
  }, [])

  const createParticles = useCallback((x: number, y: number, color: string, count: number = 5) => {
    const newParticles: Particle[] = []
    for (let i = 0; i < count; i++) {
      newParticles.push({
        id: Date.now() + i,
        x: x + (Math.random() - 0.5) * 20,
        y: y + (Math.random() - 0.5) * 20,
        velocityX: (Math.random() - 0.5) * 10,
        velocityY: (Math.random() - 0.5) * 10,
        life: 30,
        maxLife: 30,
        color,
        size: Math.random() * 4 + 2
      })
    }
    setParticles(prev => [...prev, ...newParticles])
  }, [])

  const createProjectile = useCallback((fighter: Fighter, type: 'fireball' | 'ice' | 'lightning') => {
    const projectile: Projectile = {
      id: Date.now(),
      x: fighter.facing === 'right' ? fighter.x + fighter.width : fighter.x,
      y: fighter.y + fighter.height / 2,
      velocityX: fighter.facing === 'right' ? 8 : -8,
      velocityY: 0,
      damage: SPECIAL_DAMAGE,
      owner: fighter.id,
      type,
      color: type === 'fireball' ? '#FF6B35' : type === 'ice' ? '#00D4FF' : '#FFD700',
      animationFrame: 0
    }
    setProjectiles(prev => [...prev, projectile])
  }, [])

  const checkCollision = useCallback((rect1: any, rect2: any) => {
    return rect1.x < rect2.x + rect2.width &&
           rect1.x + rect1.width > rect2.x &&
           rect1.y < rect2.y + rect2.height &&
           rect1.y + rect1.height > rect2.y
  }, [])

  const handleAttack = useCallback((attacker: Fighter, defender: Fighter) => {
    if (defender.state === 'blocking' && 
        ((attacker.facing === 'right' && defender.facing === 'left') ||
         (attacker.facing === 'left' && defender.facing === 'right'))) {
      // Blocked attack
      defender.blockStun = 15
      defender.energy = Math.max(0, defender.energy - 5)
      createParticles(defender.x + defender.width/2, defender.y + defender.height/2, '#FFD700', 3)
      return
    }

    // Successful hit
    defender.health = Math.max(0, defender.health - ATTACK_DAMAGE)
    defender.hitStun = 20
    defender.state = 'hit'
    attacker.combo += 1
    
    // Knockback
    const knockback = attacker.facing === 'right' ? 3 : -3
    defender.velocityX = knockback
    
    createParticles(defender.x + defender.width/2, defender.y + defender.height/2, '#FF0000', 8)
    
    if (defender.health <= 0) {
      const winnerName = attacker.name
      setWinner(winnerName)
      setGameState('gameOver')
      if (attacker.id === 1) {
        setScores(prev => ({ ...prev, player1: prev.player1 + 1 }))
      } else {
        setScores(prev => ({ ...prev, player2: prev.player2 + 1 }))
      }
    }
  }, [createParticles])

  const drawPixelSprite = useCallback((ctx: CanvasRenderingContext2D, fighter: Fighter) => {
    const { x, y, width, height, facing, state, color, hitStun, animationFrame } = fighter
    
    ctx.save()
    
    // Scale for pixel art effect
    ctx.imageSmoothingEnabled = false
    
    // Fighter shadow
    ctx.fillStyle = 'rgba(0, 0, 0, 0.3)'
    ctx.fillRect(x + 5, GROUND_Y + 5, width, 8)

    // Flash effect when hit
    if (hitStun > 0 && hitStun % 4 < 2) {
      ctx.fillStyle = '#FFFFFF'
    } else {
      ctx.fillStyle = color
    }

    // Draw sprite-like character
    const spriteWidth = width / 8
    const spriteHeight = height / 10

    // Body (main torso)
    ctx.fillRect(x + spriteWidth * 2, y + spriteHeight * 3, spriteWidth * 4, spriteHeight * 5)
    
    // Head
    ctx.fillStyle = '#FFDBAC' // Skin color
    ctx.fillRect(x + spriteWidth * 2.5, y, spriteWidth * 3, spriteHeight * 3)
    
    // Hair
    ctx.fillStyle = fighter.id === 1 ? '#4A90E2' : '#8B0000'
    ctx.fillRect(x + spriteWidth * 2, y, spriteWidth * 4, spriteHeight * 1.5)
    
    // Eyes
    ctx.fillStyle = '#000000'
    const eyeOffset = facing === 'right' ? 0.5 : -0.5
    ctx.fillRect(x + spriteWidth * (3 + eyeOffset), y + spriteHeight * 1.2, spriteWidth * 0.5, spriteHeight * 0.3)
    ctx.fillRect(x + spriteWidth * (4 + eyeOffset), y + spriteHeight * 1.2, spriteWidth * 0.5, spriteHeight * 0.3)
    
    // Arms
    ctx.fillStyle = color
    if (state === 'attacking' && animationFrame % 2 === 0) {
      // Extended arm for attack
      const armX = facing === 'right' ? x + spriteWidth * 6 : x + spriteWidth * 0.5
      ctx.fillRect(armX, y + spriteHeight * 4, spriteWidth * 2, spriteWidth)
    } else {
      // Normal arms
      ctx.fillRect(x + spriteWidth * 1, y + spriteHeight * 3.5, spriteWidth, spriteHeight * 3)
      ctx.fillRect(x + spriteWidth * 6, y + spriteHeight * 3.5, spriteWidth, spriteHeight * 3)
    }
    
    // Legs
    const legOffset = state === 'walking' ? Math.sin(animationFrame * 0.3) * 2 : 0
    ctx.fillRect(x + spriteWidth * 2.5, y + spriteHeight * 8, spriteWidth * 1.5, spriteHeight * 2)
    ctx.fillRect(x + spriteWidth * 4 + legOffset, y + spriteHeight * 8, spriteWidth * 1.5, spriteHeight * 2)
    
    // Special effects
    if (state === 'special') {
      ctx.fillStyle = fighter.id === 1 ? '#00D4FF' : '#FF6B35'
      ctx.fillRect(x + spriteWidth * 1, y + spriteHeight * 2, spriteWidth * 6, spriteHeight * 6)
      ctx.globalAlpha = 0.5
      ctx.fillRect(x - spriteWidth, y - spriteHeight, spriteWidth * 10, spriteHeight * 12)
      ctx.globalAlpha = 1
    }
    
    // Blocking stance
    if (state === 'blocking') {
      ctx.strokeStyle = '#00FF00'
      ctx.lineWidth = 2
      ctx.strokeRect(x - 2, y - 2, width + 4, height + 4)
      
      // Shield effect
      ctx.fillStyle = 'rgba(0, 255, 0, 0.3)'
      ctx.fillRect(x - 5, y - 5, width + 10, height + 10)
    }
    
    // Character name above head
    ctx.fillStyle = '#FFFFFF'
    ctx.font = '12px monospace'
    ctx.textAlign = 'center'
    ctx.fillText(fighter.name, x + width/2, y - 10)
    
    ctx.restore()
  }, [])

  const drawPixelProjectile = useCallback((ctx: CanvasRenderingContext2D, projectile: Projectile) => {
    const { x, y, type, color, animationFrame } = projectile
    
    ctx.save()
    ctx.imageSmoothingEnabled = false
    
    // Animated projectile sprite
    const size = 12 + Math.sin(animationFrame * 0.5) * 2
    
    if (type === 'fireball') {
      // Fireball sprite
      ctx.fillStyle = '#FF4500'
      ctx.fillRect(x - size/2, y - size/2, size, size)
      ctx.fillStyle = '#FFD700'
      ctx.fillRect(x - size/3, y - size/3, size/1.5, size/1.5)
      ctx.fillStyle = '#FFFFFF'
      ctx.fillRect(x - size/6, y - size/6, size/3, size/3)
    } else if (type === 'ice') {
      // Ice blast sprite
      ctx.fillStyle = '#87CEEB'
      ctx.fillRect(x - size/2, y - size/2, size, size)
      ctx.fillStyle = '#00BFFF'
      ctx.fillRect(x - size/3, y - size/3, size/1.5, size/1.5)
      ctx.fillStyle = '#FFFFFF'
      ctx.fillRect(x - size/6, y - size/6, size/3, size/3)
    }
    
    // Trail effect
    ctx.fillStyle = color + '60'
    for (let i = 1; i <= 3; i++) {
      const trailX = x - projectile.velocityX * i * 0.5
      const trailSize = size * (1 - i * 0.2)
      ctx.fillRect(trailX - trailSize/2, y - trailSize/2, trailSize, trailSize)
    }
    
    ctx.restore()
  }, [])

  const updateGame = useCallback(() => {
    if (gameState !== 'playing') return

    setFighters(prevFighters => {
      const newFighters = prevFighters.map(fighter => {
        const newFighter = { ...fighter }

        // Update animation
        newFighter.animationTimer++
        if (newFighter.animationTimer % 8 === 0) {
          newFighter.animationFrame++
        }

        // Update cooldowns and stuns
        if (newFighter.attackCooldown > 0) newFighter.attackCooldown--
        if (newFighter.specialCooldown > 0) newFighter.specialCooldown--
        if (newFighter.hitStun > 0) newFighter.hitStun--
        if (newFighter.blockStun > 0) newFighter.blockStun--

        // Energy regeneration
        if (newFighter.energy < newFighter.maxEnergy) {
          newFighter.energy = Math.min(newFighter.maxEnergy, newFighter.energy + 0.5)
        }

        // Reset state if stun is over
        if (newFighter.hitStun === 0 && newFighter.blockStun === 0 && newFighter.state === 'hit') {
          newFighter.state = 'idle'
        }

        // Handle input only if not stunned
        if (newFighter.hitStun === 0 && newFighter.blockStun === 0) {
          const keys = keysRef.current

          if (newFighter.id === 1) {
            // Player 1 controls (AZERTY: ZQSD + FG)
            if (keys.has('q') && newFighter.x > 0) {
              newFighter.velocityX = -MOVE_SPEED
              newFighter.facing = 'left'
              newFighter.state = 'walking'
            } else if (keys.has('d') && newFighter.x < CANVAS_WIDTH - newFighter.width) {
              newFighter.velocityX = MOVE_SPEED
              newFighter.facing = 'right'
              newFighter.state = 'walking'
            } else {
              newFighter.velocityX *= 0.8
              if (Math.abs(newFighter.velocityX) < 0.1) {
                newFighter.velocityX = 0
                if (newFighter.state === 'walking') newFighter.state = 'idle'
              }
            }

            if (keys.has('z') && newFighter.isGrounded) {
              newFighter.velocityY = JUMP_FORCE
              newFighter.isGrounded = false
              newFighter.state = 'jumping'
            }

            if (keys.has('f') && newFighter.attackCooldown === 0) {
              newFighter.state = 'attacking'
              newFighter.attackCooldown = 30
            }

            if (keys.has('g') && newFighter.energy >= 30 && newFighter.specialCooldown === 0) {
              newFighter.state = 'special'
              newFighter.energy -= 30
              newFighter.specialCooldown = 60
              createProjectile(newFighter, 'ice')
            }

            if (keys.has('s')) {
              newFighter.state = 'blocking'
            }
          } else {
            // Player 2 controls (Arrow keys + NM) - Fixed arrow key detection
            if (keys.has('arrowleft') && newFighter.x > 0) {
              newFighter.velocityX = -MOVE_SPEED
              newFighter.facing = 'left'
              newFighter.state = 'walking'
            } else if (keys.has('arrowright') && newFighter.x < CANVAS_WIDTH - newFighter.width) {
              newFighter.velocityX = MOVE_SPEED
              newFighter.facing = 'right'
              newFighter.state = 'walking'
            } else {
              newFighter.velocityX *= 0.8
              if (Math.abs(newFighter.velocityX) < 0.1) {
                newFighter.velocityX = 0
                if (newFighter.state === 'walking') newFighter.state = 'idle'
              }
            }

            if (keys.has('arrowup') && newFighter.isGrounded) {
              newFighter.velocityY = JUMP_FORCE
              newFighter.isGrounded = false
              newFighter.state = 'jumping'
            }

            if (keys.has('n') && newFighter.attackCooldown === 0) {
              newFighter.state = 'attacking'
              newFighter.attackCooldown = 30
            }

            if (keys.has('m') && newFighter.energy >= 30 && newFighter.specialCooldown === 0) {
              newFighter.state = 'special'
              newFighter.energy -= 30
              newFighter.specialCooldown = 60
              createProjectile(newFighter, 'fireball')
            }

            if (keys.has('arrowdown')) {
              newFighter.state = 'blocking'
            }
          }
        }

        // Apply gravity
        if (!newFighter.isGrounded) {
          newFighter.velocityY += GRAVITY
        }

        // Update position
        newFighter.x += newFighter.velocityX
        newFighter.y += newFighter.velocityY

        // Ground collision
        if (newFighter.y >= GROUND_Y - newFighter.height) {
          newFighter.y = GROUND_Y - newFighter.height
          newFighter.velocityY = 0
          newFighter.isGrounded = true
          if (newFighter.state === 'jumping') newFighter.state = 'idle'
        }

        // Screen boundaries
        newFighter.x = Math.max(0, Math.min(CANVAS_WIDTH - newFighter.width, newFighter.x))

        return newFighter
      })

      // Check for attacks between fighters
      if (newFighters.length === 2) {
        const [fighter1, fighter2] = newFighters

        if (fighter1.state === 'attacking' && fighter1.attackCooldown === 29) {
          const attackRange = {
            x: fighter1.facing === 'right' ? fighter1.x + fighter1.width : fighter1.x - 40,
            y: fighter1.y,
            width: 40,
            height: fighter1.height
          }
          if (checkCollision(attackRange, fighter2)) {
            handleAttack(fighter1, fighter2)
          }
        }

        if (fighter2.state === 'attacking' && fighter2.attackCooldown === 29) {
          const attackRange = {
            x: fighter2.facing === 'right' ? fighter2.x + fighter2.width : fighter2.x - 40,
            y: fighter2.y,
            width: 40,
            height: fighter2.height
          }
          if (checkCollision(attackRange, fighter1)) {
            handleAttack(fighter2, fighter1)
          }
        }
      }

      return newFighters
    })

    // Update projectiles
    setProjectiles(prevProjectiles => {
      return prevProjectiles.filter(projectile => {
        projectile.x += projectile.velocityX
        projectile.y += projectile.velocityY
        projectile.animationFrame++

        // Check collision with fighters
        const targetFighter = fighters.find(f => f.id !== projectile.owner)
        if (targetFighter && checkCollision(projectile, targetFighter)) {
          if (targetFighter.state !== 'blocking') {
            targetFighter.health = Math.max(0, targetFighter.health - projectile.damage)
            targetFighter.hitStun = 25
            targetFighter.state = 'hit'
            createParticles(targetFighter.x + targetFighter.width/2, targetFighter.y + targetFighter.height/2, projectile.color, 10)
          }
          return false
        }

        // Remove if off screen
        return projectile.x > -50 && projectile.x < CANVAS_WIDTH + 50
      })
    })

    // Update particles
    setParticles(prevParticles => {
      return prevParticles.filter(particle => {
        particle.x += particle.velocityX
        particle.y += particle.velocityY
        particle.velocityX *= 0.98
        particle.velocityY *= 0.98
        particle.life--
        return particle.life > 0
      })
    })
  }, [gameState, fighters, checkCollision, handleAttack, createProjectile, createParticles])

  const draw = useCallback(() => {
    const canvas = canvasRef.current
    if (!canvas) return

    const ctx = canvas.getContext('2d')
    if (!ctx) return

    // Disable image smoothing for pixel art
    ctx.imageSmoothingEnabled = false

    // Clear canvas with retro background
    const gradient = ctx.createLinearGradient(0, 0, 0, CANVAS_HEIGHT)
    gradient.addColorStop(0, '#2C1810')
    gradient.addColorStop(0.5, '#8B4513')
    gradient.addColorStop(1, '#654321')
    ctx.fillStyle = gradient
    ctx.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT)

    // Draw pixelated ground pattern
    ctx.fillStyle = '#8B4513'
    for (let x = 0; x < CANVAS_WIDTH; x += 20) {
      for (let y = GROUND_Y; y < CANVAS_HEIGHT; y += 20) {
        if ((x + y) % 40 === 0) {
          ctx.fillStyle = '#A0522D'
        } else {
          ctx.fillStyle = '#8B4513'
        }
        ctx.fillRect(x, y, 20, 20)
      }
    }

    // Draw background elements (retro style)
    ctx.fillStyle = '#654321'
    ctx.fillRect(0, GROUND_Y - 100, CANVAS_WIDTH, 20) // Platform line
    
    // Draw fighters with pixel sprites
    fighters.forEach(fighter => {
      drawPixelSprite(ctx, fighter)
    })

    // Draw projectiles with pixel sprites
    projectiles.forEach(projectile => {
      drawPixelProjectile(ctx, projectile)
    })

    // Draw particles
    particles.forEach(particle => {
      const alpha = particle.life / particle.maxLife
      ctx.fillStyle = particle.color + Math.floor(alpha * 255).toString(16).padStart(2, '0')
      ctx.fillRect(particle.x - particle.size/2, particle.y - particle.size/2, particle.size, particle.size)
    })
  }, [fighters, projectiles, particles, drawPixelSprite, drawPixelProjectile])

  const gameLoop = useCallback(() => {
    updateGame()
    draw()
    animationRef.current = requestAnimationFrame(gameLoop)
  }, [updateGame, draw])

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Convert key to lowercase for consistent handling
      const key = e.key.toLowerCase()
      keysRef.current.add(key)
      
      if (e.key === 'Escape') {
        setGameState(prev => prev === 'playing' ? 'paused' : 'playing')
      }
    }

    const handleKeyUp = (e: KeyboardEvent) => {
      // Convert key to lowercase for consistent handling
      const key = e.key.toLowerCase()
      keysRef.current.delete(key)
    }

    window.addEventListener('keydown', handleKeyDown)
    window.addEventListener('keyup', handleKeyUp)

    return () => {
      window.removeEventListener('keydown', handleKeyDown)
      window.removeEventListener('keyup', handleKeyUp)
    }
  }, [])

  useEffect(() => {
    if (gameState === 'playing') {
      gameLoop()
    } else {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current)
      }
    }

    return () => {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current)
      }
    }
  }, [gameState, gameLoop])

  const startGame = () => {
    initializeFighters()
    setGameState('playing')
  }

  const resetGame = () => {
    setScores({ player1: 0, player2: 0 })
    setRound(1)
    startGame()
  }

  const nextRound = () => {
    setRound(prev => prev + 1)
    startGame()
  }

  if (gameState === 'menu') {
    return (
      <div className="min-h-screen bg-gradient-to-b from-amber-900 via-orange-800 to-red-900 flex items-center justify-center" 
           style={{ fontFamily: 'monospace', imageRendering: 'pixelated' }}>
        <div className="text-center text-white">
          <h1 className="text-6xl font-bold mb-8 text-yellow-400 tracking-wider" 
              style={{ textShadow: '4px 4px 0px #8B4513' }}>
            MORTAL KOMBAT
          </h1>
          <p className="text-xl mb-8 text-orange-200">Retro 2-Player Fighting Game</p>
          
          <div className="mb-8 space-y-4">
            <div className="bg-amber-900 border-4 border-yellow-600 p-4 rounded-lg">
              <h3 className="text-lg font-bold mb-2 text-yellow-300">Joueur 1 (Sub-Zero)</h3>
              <div className="grid grid-cols-2 gap-2 text-sm text-orange-200">
                <div>ZQSD - Déplacer/Sauter</div>
                <div>F - Attaque</div>
                <div>S - Bloquer</div>
                <div>G - Spécial (Glace)</div>
              </div>
            </div>
            
            <div className="bg-red-900 border-4 border-red-600 p-4 rounded-lg">
              <h3 className="text-lg font-bold mb-2 text-red-300">Joueur 2 (Scorpion)</h3>
              <div className="grid grid-cols-2 gap-2 text-sm text-red-200">
                <div>Flèches - Déplacer/Sauter</div>
                <div>N - Attaque</div>
                <div>↓ - Bloquer</div>
                <div>M - Spécial (Boule de feu)</div>
              </div>
            </div>
          </div>
          
          <button
            onClick={startGame}
            className="bg-red-700 hover:bg-red-600 border-4 border-yellow-500 px-8 py-4 rounded-lg text-xl font-bold transition-colors text-yellow-200"
            style={{ textShadow: '2px 2px 0px #000' }}
          >
            COMMENCER LE COMBAT
          </button>
        </div>
      </div>
    )
  }

  if (gameState === 'gameOver') {
    return (
      <div className="min-h-screen bg-gradient-to-b from-amber-900 via-orange-800 to-red-900 flex items-center justify-center"
           style={{ fontFamily: 'monospace', imageRendering: 'pixelated' }}>
        <div className="text-center text-white">
          <h1 className="text-5xl font-bold mb-4 text-yellow-400" style={{ textShadow: '4px 4px 0px #8B4513' }}>
            FINISH HIM!
          </h1>
          <h2 className="text-3xl mb-8 text-orange-200">{winner} GAGNE!</h2>
          
          <div className="mb-8">
            <div className="text-xl mb-4 text-yellow-300">Score</div>
            <div className="flex justify-center space-x-8">
              <div className="text-blue-400">Sub-Zero: {scores.player1}</div>
              <div className="text-red-400">Scorpion: {scores.player2}</div>
            </div>
          </div>
          
          <div className="space-x-4">
            <button
              onClick={nextRound}
              className="bg-green-700 hover:bg-green-600 border-4 border-green-400 px-6 py-3 rounded-lg font-bold transition-colors"
            >
              ROUND SUIVANT
            </button>
            <button
              onClick={resetGame}
              className="bg-blue-700 hover:bg-blue-600 border-4 border-blue-400 px-6 py-3 rounded-lg font-bold transition-colors"
            >
              NOUVEAU JEU
            </button>
          </div>
        </div>
      </div>
    )
  }

  if (gameState === 'paused') {
    return (
      <div className="min-h-screen bg-gradient-to-b from-amber-900 via-orange-800 to-red-900 flex items-center justify-center"
           style={{ fontFamily: 'monospace', imageRendering: 'pixelated' }}>
        <div className="text-center text-white">
          <h1 className="text-4xl font-bold mb-8 text-yellow-400">PAUSE</h1>
          <button
            onClick={() => setGameState('playing')}
            className="bg-green-700 hover:bg-green-600 border-4 border-green-400 px-6 py-3 rounded-lg font-bold transition-colors"
          >
            REPRENDRE
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-amber-900 flex flex-col items-center justify-center p-4"
         style={{ fontFamily: 'monospace', imageRendering: 'pixelated' }}>
      {/* Game UI */}
      <div className="w-full max-w-6xl mb-4">
        <div className="flex justify-between items-center text-white">
          {/* Player 1 UI */}
          <div className="flex items-center space-x-4">
            <div className="text-blue-400 font-bold text-lg">SUB-ZERO</div>
            <div className="w-64 bg-gray-800 border-2 border-gray-600 rounded-full h-6">
              <div 
                className="bg-red-500 h-6 rounded-full transition-all duration-300 border-r-2 border-red-700"
                style={{ width: `${(fighters[0]?.health / fighters[0]?.maxHealth) * 100 || 0}%` }}
              />
            </div>
            <Heart className="text-red-500" size={24} />
          </div>

          {/* Center UI */}
          <div className="text-center">
            <div className="text-yellow-400 font-bold text-2xl" style={{ textShadow: '2px 2px 0px #8B4513' }}>
              ROUND {round}
            </div>
            <div className="text-sm text-orange-200">ESC pour Pause</div>
          </div>

          {/* Player 2 UI */}
          <div className="flex items-center space-x-4">
            <Heart className="text-red-500" size={24} />
            <div className="w-64 bg-gray-800 border-2 border-gray-600 rounded-full h-6">
              <div 
                className="bg-red-500 h-6 rounded-full transition-all duration-300 border-r-2 border-red-700"
                style={{ width: `${(fighters[1]?.health / fighters[1]?.maxHealth) * 100 || 0}%` }}
              />
            </div>
            <div className="text-red-400 font-bold text-lg">SCORPION</div>
          </div>
        </div>

        {/* Energy bars */}
        <div className="flex justify-between mt-2">
          <div className="flex items-center space-x-2">
            <Zap className="text-blue-400" size={20} />
            <div className="w-32 bg-gray-800 border-2 border-gray-600 rounded-full h-3">
              <div 
                className="bg-blue-400 h-3 rounded-full transition-all duration-300"
                style={{ width: `${(fighters[0]?.energy / fighters[0]?.maxEnergy) * 100 || 0}%` }}
              />
            </div>
          </div>
          
          <div className="flex items-center space-x-2">
            <div className="w-32 bg-gray-800 border-2 border-gray-600 rounded-full h-3">
              <div 
                className="bg-red-400 h-3 rounded-full transition-all duration-300"
                style={{ width: `${(fighters[1]?.energy / fighters[1]?.maxEnergy) * 100 || 0}%` }}
              />
            </div>
            <Zap className="text-red-400" size={20} />
          </div>
        </div>
      </div>

      {/* Game Canvas */}
      <canvas
        ref={canvasRef}
        width={CANVAS_WIDTH}
        height={CANVAS_HEIGHT}
        className="border-4 border-yellow-600 rounded-lg shadow-2xl"
        style={{ imageRendering: 'pixelated' }}
      />

      {/* Controls reminder */}
      <div className="mt-4 text-white text-sm text-center opacity-75">
        <div className="flex justify-center space-x-8">
          <div className="text-blue-300">J1: ZQSD + F(Attaque) + G(Spécial) + S(Bloquer)</div>
          <div className="text-red-300">J2: Flèches + N(Attaque) + M(Spécial) + ↓(Bloquer)</div>
        </div>
      </div>
    </div>
  )
}

export default App

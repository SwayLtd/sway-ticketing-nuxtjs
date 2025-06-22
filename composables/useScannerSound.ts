/**
 * Composable pour gérer le feedback sonore du scanner
 * Utilise la Web Audio API pour générer des sons synthétiques
 */
import { ref } from 'vue'

export const soundEnabled = ref(true) // Shared global state

export const useScannerSound = () => {
  let audioContext: AudioContext | null = null

  // Initialiser le contexte audio
  const initAudioContext = () => {
    if (!import.meta.client || audioContext) return

    try {
      audioContext = new (window.AudioContext || (window as any).webkitAudioContext)()
    } catch (error) {
      console.warn('Audio Context non supporté:', error)
    }
  }

  // Charger les préférences depuis localStorage
  const loadSoundPreferences = () => {
    if (!import.meta.client) return

    const savedSound = localStorage.getItem('scanner-sound-enabled')
    if (savedSound !== null) {
      soundEnabled.value = JSON.parse(savedSound)
    }
  }

  // Sauvegarder les préférences
  const saveSoundPreferences = () => {
    if (!import.meta.client) return
    localStorage.setItem('scanner-sound-enabled', JSON.stringify(soundEnabled.value))
  }

  // Jouer un son synthétique
  const playTone = (frequency: number, duration: number, type: OscillatorType = 'sine', volume: number = 0.3) => {
    if (!audioContext || !soundEnabled.value) return

    try {
      // Reprendre le contexte audio si suspendu (requis sur certains navigateurs)
      if (audioContext.state === 'suspended') {
        audioContext.resume()
      }

      const oscillator = audioContext.createOscillator()
      const gainNode = audioContext.createGain()

      oscillator.connect(gainNode)
      gainNode.connect(audioContext.destination)

      oscillator.frequency.setValueAtTime(frequency, audioContext.currentTime)
      oscillator.type = type

      // Envelope pour éviter les clics
      gainNode.gain.setValueAtTime(0, audioContext.currentTime)
      gainNode.gain.linearRampToValueAtTime(volume, audioContext.currentTime + 0.01)
      gainNode.gain.exponentialRampToValueAtTime(0.001, audioContext.currentTime + duration)

      oscillator.start(audioContext.currentTime)
      oscillator.stop(audioContext.currentTime + duration)
    } catch (error) {
      console.warn('Erreur lors de la lecture du son:', error)
    }
  }

  // Son de détection QR (simple bip court)
  const playDetectionSound = () => {
    playTone(800, 0.1, 'square', 0.2)
  }

  // Son de succès (double bip ascendant)
  const playSuccessSound = () => {
    playTone(600, 0.15, 'sine', 0.3)
    setTimeout(() => {
      playTone(800, 0.15, 'sine', 0.3)
    }, 100)
  }

  // Son d'avertissement (bip long modulé)
  const playWarningSound = () => {
    playTone(500, 0.3, 'triangle', 0.25)
    setTimeout(() => {
      playTone(450, 0.2, 'triangle', 0.2)
    }, 200)
  }

  // Son d'erreur (triple bip descendant)
  const playErrorSound = () => {
    playTone(400, 0.1, 'sawtooth', 0.3)
    setTimeout(() => {
      playTone(350, 0.1, 'sawtooth', 0.3)
    }, 120)
    setTimeout(() => {
      playTone(300, 0.15, 'sawtooth', 0.3)
    }, 240)
  }

  // Jouer le son approprié selon le type de scan
  const playScanSound = (type: 'detection' | 'success' | 'warning' | 'error') => {
    if (!soundEnabled.value) return

    switch (type) {
      case 'detection':
        playDetectionSound()
        break
      case 'success':
        playSuccessSound()
        break
      case 'warning':
        playWarningSound()
        break
      case 'error':
        playErrorSound()
        break
    }
  }

  // Activer/désactiver le son
  const toggleSound = () => {
    soundEnabled.value = !soundEnabled.value
    saveSoundPreferences()
  }

  // Test des sons (pour les paramètres)
  const testSounds = () => {
    if (!soundEnabled.value) return

    const sounds = ['detection', 'success', 'warning', 'error'] as const
    sounds.forEach((sound, index) => {
      setTimeout(() => {
        playScanSound(sound)
      }, index * 800)
    })
  }

  return {
    initAudioContext,
    loadSoundPreferences,
    playScanSound,
    toggleSound,
    testSounds
  }
}

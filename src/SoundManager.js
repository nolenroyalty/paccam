const SOUNDS = [
  { src: "pacman-chomp-padded.mp3", volume: 0.2, name: "chomp" },
  { src: "pacman-fruit.mp3", volume: 0.5, name: "fruit" },
  { src: "pacman-start.mp3", volume: 0.4, name: "start" },
  { src: "pacman-super.mp3", volume: 0.2, name: "super" },
  { src: "pacman-die.mp3", volume: 0.2, name: "die" },
];

class SoundManager {
  constructor() {
    this.enabled = false;
    this.sounds = {};
    this.audioContext = new (window.AudioContext ||
      window.webkitAudioContext)();
  }

  async loadSound({ src, volume, name }) {
    const response = await fetch(`/sounds/${src}`);
    const arrayBuffer = await response.arrayBuffer();
    const audioBuffer = await this.audioContext.decodeAudioData(arrayBuffer);
    const nodes = { source: null, gainNode: null };
    this.sounds[name] = {
      audioBuffer,
      volume,
      nodes,
      stopping: false,
      playing: false,
      looping: false,
    };
    return this.sounds[name];
  }

  async resumeAudioContext() {
    await this.audioContext.resume();
  }

  async loadAllSounds() {
    if (this.enabled) {
      console.error("SoundManager already enabled");
      return;
    }
    try {
      await Promise.all(SOUNDS.map((sound) => this.loadSound(sound)));
      this.enabled = true;
      return true;
    } catch (error) {
      console.error("Error loading sounds", error);
      return false;
    }
  }

  validateSoundName({ name }) {
    if (!this.enabled) {
      throw new Error(`tried to play ${name} but SoundManager is not enabled`);
    }
    if (!this.sounds[name]) {
      throw new Error(`sound ${name} not found`);
    }
    return true;
  }

  _forceStopSound({ name }) {
    this.validateSoundName({ name });
    const { nodes } = this.sounds[name];
    const { source, gainNode } = nodes;
    if (source && gainNode) {
      source.stop();
      source.disconnect();
      gainNode.disconnect();
      this.sounds[name].playing = false;
      this.sounds[name].looping = false;
      this.sounds[name].nodes = { source: null, gainNode: null };
    }
  }

  _startSound({ name, loop }) {
    this.validateSoundName({ name });
    const { audioBuffer, volume } = this.sounds[name];
    const source = this.audioContext.createBufferSource();
    source.buffer = audioBuffer;
    const gainNode = this.audioContext.createGain();
    gainNode.gain.value = volume;
    source.connect(gainNode);
    gainNode.connect(this.audioContext.destination);
    source.loop = loop;
    source.start(0);
    this.sounds[name].nodes = { source, gainNode };
    this.sounds[name].playing = true;
    this.sounds[name].looping = loop;

    source.onended = () => {
      this.sounds[name].playing = false;
      this.sounds[name].looping = false;
      source.disconnect();
      gainNode.disconnect();
      this.sounds[name].nodes = { source: null, gainNode: null };
    };
  }

  playSound({ name, loop = false }) {
    this.validateSoundName({ name });
    const { playing, looping, nodes } = this.sounds[name];
    let { source } = nodes;
    if (playing && !looping && loop) {
      source.loop = true;
    } else if (playing && looping && loop) {
      // nothing to do
    } else if (playing && looping && !loop) {
      this._forceStopSound({ name });
      this._startSound({ name, loop });
    } else if (playing) {
      this._forceStopSound({ name });
      this._startSound({ name, loop });
    } else {
      this._startSound({ name, loop });
    }
  }

  stopLooping({ name }) {
    console.log("STOP LOOPING: ", name);
    this.validateSoundName({ name });
    const { playing, looping } = this.sounds[name];
    if (playing && looping) {
      this.sounds[name].nodes.source.loop = false;
      this.sounds[name].looping = false;
    }
  }

  stopAllSounds() {
    Object.keys(this.sounds).forEach((name) => {
      this._forceStopSound({ name });
    });
  }
}

export default SoundManager;

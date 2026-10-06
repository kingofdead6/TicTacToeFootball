import mongoose from 'mongoose'

const profileSchema = new mongoose.Schema(
  {
    username: {
      type: String,
      required: true,
      trim: true,
      minlength: 3,
      maxlength: 18,
      match: /^[a-zA-Z0-9_]+$/,
    },
    usernameLower: { type: String, required: true, unique: true },
    avatar: { type: String, default: '⚽', maxlength: 8 },
    // sha256 of the secret token the browser keeps; never returned by queries
    tokenHash: { type: String, required: true, unique: true, select: false },
    rating: { type: Number, default: 1000 },
    peakRating: { type: Number, default: 1000 },
    stats: {
      played: { type: Number, default: 0 },
      wins: { type: Number, default: 0 },
      draws: { type: Number, default: 0 },
      losses: { type: Number, default: 0 },
      roundsWon: { type: Number, default: 0 },
      correctGuesses: { type: Number, default: 0 },
      wrongGuesses: { type: Number, default: 0 },
    },
    streak: { type: Number, default: 0 }, // current win streak
    bestStreak: { type: Number, default: 0 },
    lastPlayedAt: { type: Date },
  },
  { timestamps: true },
)

profileSchema.index({ rating: -1 })

profileSchema.methods.toPublic = function () {
  const s = this.stats
  return {
    id: this._id.toString(),
    username: this.username,
    avatar: this.avatar,
    rating: Math.round(this.rating),
    peakRating: Math.round(this.peakRating),
    stats: {
      played: s.played,
      wins: s.wins,
      draws: s.draws,
      losses: s.losses,
      roundsWon: s.roundsWon,
      correctGuesses: s.correctGuesses,
      wrongGuesses: s.wrongGuesses,
      winRate: s.played ? Math.round((s.wins / s.played) * 100) : 0,
      accuracy: s.correctGuesses + s.wrongGuesses ? Math.round((s.correctGuesses / (s.correctGuesses + s.wrongGuesses)) * 100) : 0,
    },
    streak: this.streak,
    bestStreak: this.bestStreak,
    lastPlayedAt: this.lastPlayedAt,
    createdAt: this.createdAt,
  }
}

export const Profile = mongoose.model('Profile', profileSchema)

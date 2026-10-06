import mongoose from 'mongoose'

const { Schema } = mongoose

const moveSchema = new Schema(
  {
    mark: { type: String, enum: ['X', 'O'] },
    cell: Number,
    footballer: String, // slug
    name: String,
    result: { type: String, enum: ['correct', 'wrong', 'timeout', 'skip'] },
    at: { type: Date, default: Date.now },
  },
  { _id: false },
)

const roundSchema = new Schema(
  {
    grid: { rows: [String], cols: [String] },
    winner: { type: String, enum: ['X', 'O', null], default: null },
    moves: [moveSchema],
  },
  { _id: false },
)

const seatSchema = new Schema(
  {
    profile: { type: Schema.Types.ObjectId, ref: 'Profile', default: null },
    name: String,
    avatar: String,
    mark: { type: String, enum: ['X', 'O'] },
    roundsWon: { type: Number, default: 0 },
    ratingBefore: Number,
    ratingAfter: Number,
  },
  { _id: false },
)

const matchSchema = new Schema(
  {
    code: { type: String, default: null }, // room code for online matches
    mode: { type: String, enum: ['online', 'local', 'cpu'], required: true },
    ranked: { type: Boolean, default: false },
    difficulty: { type: String, default: 'medium' },
    timer: { type: Number, default: 0 },
    bestOf: { type: Number, default: 1 },
    players: [seatSchema],
    rounds: [roundSchema],
    winner: { type: String, enum: ['X', 'O', null], default: null },
    endReason: { type: String, enum: ['completed', 'forfeit', 'draw_agreed'], default: 'completed' },
    startedAt: Date,
    endedAt: { type: Date, default: Date.now },
  },
  { timestamps: true },
)

matchSchema.index({ endedAt: -1 })
matchSchema.index({ 'players.profile': 1, endedAt: -1 })

matchSchema.methods.toPublic = function () {
  return {
    id: this._id.toString(),
    code: this.code,
    mode: this.mode,
    ranked: this.ranked,
    difficulty: this.difficulty,
    bestOf: this.bestOf,
    winner: this.winner,
    endReason: this.endReason,
    playedAt: this.endedAt,
    players: this.players.map((p) => ({
      name: p.name,
      avatar: p.avatar,
      mark: p.mark,
      roundsWon: p.roundsWon,
      ratingBefore: p.ratingBefore,
      ratingAfter: p.ratingAfter,
    })),
  }
}

export const Match = mongoose.model('Match', matchSchema)

import mongoose from 'mongoose'

// Mirror of the in-memory category registry (clubs, nations, awards)
const categorySchema = new mongoose.Schema(
  {
    key: { type: String, required: true, unique: true }, // e.g. "real_madrid", "nat_france", "award_ucl"
    type: { type: String, enum: ['club', 'nation', 'award'], required: true },
    name: { type: String, required: true },
    short: String,
    country: String,
    colors: [String],
    flag: String,
    icon: String,
    description: String,
    tier: { type: Number, default: 3 },
    wikidataId: String,
    playerCount: { type: Number, default: 0 },
  },
  { timestamps: true },
)

export const Category = mongoose.model('Category', categorySchema)

// Tracks which dataset version has been mirrored into MongoDB
const metaSchema = new mongoose.Schema({ key: { type: String, unique: true }, value: mongoose.Schema.Types.Mixed })
export const Meta = mongoose.model('Meta', metaSchema)

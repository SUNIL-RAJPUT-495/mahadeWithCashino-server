import mongoose from 'mongoose';

const upiSettingSchema = new mongoose.Schema({
    upiId: {
        type: String,
        required: true,
        trim: true
    },
    merchantName: {
        type: String,
        required: true,
        default: "Mahadev Admin"
    },
    qrCodeImage: {
        type: String, // (Optional) Agar QR code ki image URL save karni ho
        default: ""
    },
    isActive: {
        type: Boolean,
        default: false
    }
}, { timestamps: true });

export default mongoose.model('UpiSetting', upiSettingSchema);
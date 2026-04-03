import UpiSetting from "../models/UpiSetting.js";

export const addUpi = async (req, res) => {
    try {
        const { upiId, merchantName, isActive } = req.body;
        
        let qrCodeImagePath = "";
        if (req.file) {
            qrCodeImagePath = `/uploads/${req.file.filename}`;
        }

        const newUpi = new UpiSetting({
            upiId: upiId,
            merchantName: merchantName,
            qrCodeImage: qrCodeImagePath, 
            isActive: isActive === 'true' 
        });

        await newUpi.save();

        res.status(201).json({ 
            success: true, 
            message: "UPI & QR Code added successfully", 
            data: newUpi 
        });

    } catch (error) {
        console.error("Upload Error:", error);
        res.status(500).json({ success: false, message: error.message });
    }
};


export const getAllUpis = async (req, res) => {
    try {
        const upis = await UpiSetting.find().sort({ createdAt: -1 });
        res.status(200).json({ success: true, data: upis });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

export const setActiveUpi = async (req, res) => {
    try {
        const { id } = req.params;
        await UpiSetting.updateMany({}, { isActive: false });

        const activeUpi = await UpiSetting.findByIdAndUpdate(id, { isActive: true }, { new: true });

        if (!activeUpi) {
            return res.status(404).json({ success: false, message: "UPI not found" });
        }

        res.status(200).json({ success: true, message: "UPI activated successfully", data: activeUpi });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

// 4. Admin: Delete UPI
export const deleteUpi = async (req, res) => {
    try {
        const { id } = req.params;
        await UpiSetting.findByIdAndDelete(id);
        res.status(200).json({ success: true, message: "UPI deleted successfully" });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

// 6. Admin: Update UPI
export const updateUpi = async (req, res) => {
    try {
        const { id } = req.params;
        const { upiId, merchantName, isActive } = req.body;

        const updateData = {
            upiId,
            merchantName,
            isActive: isActive === 'true' || isActive === true
        };

        // Only update image if a new file was uploaded
        if (req.file) {
            updateData.qrCodeImage = `/uploads/${req.file.filename}`;
        }

        const updatedUpi = await UpiSetting.findByIdAndUpdate(id, updateData, { new: true });

        if (!updatedUpi) {
            return res.status(404).json({ success: false, message: "UPI not found" });
        }

        res.status(200).json({ success: true, message: "UPI updated successfully", data: updatedUpi });
    } catch (error) {
        console.error("Update UPI Error:", error);
        res.status(500).json({ success: false, message: error.message });
    }
};

// 5. User App: Get Only Active UPI (Yeh API user app pe call hogi deposit ke time)
export const getActiveUpi = async (req, res) => {
    try {
        const activeUpi = await UpiSetting.findOne({ isActive: true });
        
        if (!activeUpi) {
            return res.status(404).json({ success: false, message: "No active UPI found. Please contact admin." });
        }

        res.status(200).json({ success: true, data: activeUpi });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};
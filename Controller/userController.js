import User from '../models/User.js';
import jwt from 'jsonwebtoken';
import bcrypt from 'bcrypt';


export const createUser = async (req, res) => {
    try {
        const { name, mobile, refCode, pass, role } = req.body;

        if (!name || !mobile || !pass) {
            return res.status(400).json({ 
                success: false, 
                message: 'Name, mobile and password is required!' 
            });
        }

        const existingUser = await User.findOne({ mobile });
        if (existingUser) {
            return res.status(400).json({ 
                success: false, 
                message: 'Mobile number is alredy registered!' 
            });
        }

        const saltRounds = 10;
        const hashedPassword = await bcrypt.hash(pass, saltRounds);

        const user = await User.create({ 
            name, 
            mobile, 
            referralCode: refCode || '', 
            password: hashedPassword, 
            role: role || 'USER' 
        });

        const userResponse = user.toObject();
        delete userResponse.password;

        res.status(201).json({ 
            success: true, 
            message: 'User created successfully', 
            user: userResponse 
        });

    } catch (error) {
        console.error("User Creation Error: ", error); 
        res.status(500).json({ 
            success: false, 
            message: 'Internal server error', 
            error: error.message 
        });
    }
}


export const loginUser = async (req, res) => {
    try {
        const { mobile, pass } = req.body;

        if (!mobile || !pass) {
            return res.status(400).json({ success: false, message: 'All fields are required' });
        }
        const user = await User.findOne({ mobile });
        if (!user) {
            return res.status(400).json({ success: false, message: 'User not found' });
        }

        const isPasswordValid = await bcrypt.compare(pass, user.password);
        if (!isPasswordValid) {
            return res.status(400).json({ success: false, message: 'Invalid credentials' });
        }
        const tokenData = {
            _id: user._id,
            mobile: user.mobile,
            role: user.role
        };

        const token = jwt.sign(tokenData, process.env.JWT_SECRET, { expiresIn: '7d' });

        const cookieOptions = {
            httpOnly: true, 
            secure: process.env.NODE_ENV === 'production', 
            sameSite: 'None',
            expires: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000) 
        };

        res.cookie("token", token, cookieOptions).status(200).json({
            success: true,
            message: 'Login successful',
            token: token, 
            user: {
                _id: user._id,
                name: user.name,
                mobile: user.mobile,
                walletBalance: user.walletBalance,
                role: user.role
            }
        });

    } catch (error) {
        console.error("Login Error: ", error);
        res.status(500).json({ success: false, message: 'Internal server error', error: error.message });
    }
};

export const getUserProfile = async (req, res) => {
    try {
        const user = await User.findById(req.userId).select('-password');

        if (!user) {
            return res.status(404).json({ 
                success: false, 
                message: 'User nahi mila' 
            });
        }

        res.status(200).json({ 
            success: true, 
            user: {
                _id: user._id,
                name: user.name,
                mobile: user.mobile,
                email: user.email,
                walletBalance: user.walletBalance, 
                role: user.role,
                status: user.status,
                referralCode: user.referralCode
            }
        });
    } catch (error) {
        res.status(500).json({ 
            success: false, 
            message: 'Internal server error', 
            error: error.message 
        });
    }
}  


export const getUser = async (req, res) => {
    try {
        const user = await User.find();
        res.status(200).json({ user });
    } catch (error) {
        res.status(500).json({ message: 'Internal server error', error: error.message });
    }
}
export const updateUser = async (req, res) => {
    try {
        const { id } = req.params;
        const { name, email, phone } = req.body;
        if (!name || !email || !phone) {
            return res.status(400).json({ message: 'All fields are required' });
        }
        const user = await User.findByIdAndUpdate(id, { name, email, phone }, { new: true });
        res.status(200).json({ message: 'User updated successfully', user });
    } catch (error) {
        res.status(500).json({ message: 'Internal server error', error: error.message });
    }
}
export const deleteUser = async (req, res) => {
    try {
        const { id } = req.params;
        const user = await User.findByIdAndDelete(id);
        res.status(200).json({ message: 'User deleted successfully', user });
    } catch (error) {
        res.status(500).json({ message: 'Internal server error', error: error.message });
    }
}


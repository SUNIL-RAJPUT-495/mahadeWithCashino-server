import Transaction from "../models/Transaction.js";
import User from "../models/User.js";


export const createDepositRequest = async (req, res) => {
    try {
        const userId = req.userId; 
        
        const { amount, method, transactionId, accountDetails } = req.body;

        // Validation
        if (!amount || !method || !transactionId || !accountDetails) {
            return res.status(400).json({ message: 'All fields are required' });
        }

        // Amount Check (Taaki koi negative ya zero na bheje)
        const depositAmount = Number(amount);
        if (depositAmount <= 0) {
            return res.status(400).json({ message: 'Invalid deposit amount' });
        }

        const user = await User.findById(userId);
        if (!user) {
            return res.status(404).json({ message: 'User not found' });
        }

        // Check if UTR/Transaction ID is already used (Duplicate Payment Rokne ke liye)
        const existingTransaction = await Transaction.findOne({ transactionId });
        if (existingTransaction) {
            return res.status(400).json({ message: 'This Transaction ID is already submitted!' });
        }

        // ✨ EXACT SCHEMA MATCHING ✨
        const transaction = await Transaction.create({ 
            userId: userId,             // Schema field match
            type: 'Deposit',            // REQUIRED field by enum
            amount: depositAmount, 
            method: method, 
            transactionId: transactionId, 
            accountDetails: accountDetails, 
            status: 'Pending'           // Default is pending
        });

        res.status(201).json({ 
            success: true,
            message: 'Deposit request created successfully', 
            transaction 
        });

    } catch (error) {
        console.error("Deposit Controller Error:", error);
        res.status(500).json({ 
            success: false,
            message: 'Internal server error', 
            error: error.message 
        });
    }
}

export const updateTransactionStatus = async (req, res) => {
    try {
        const { transactionId, status } = req.body;
        if (!transactionId || !status) {
            return res.status(400).json({ message: 'All fields are required' });
        }
        if(!['Pending', 'Approved', 'Rejected'].includes(status)) {
            return res.status(400).json({ message: 'Invalid status' });
        }
        const transaction = await Transaction.findById(transactionId);
        if (!transaction) {
            return res.status(400).json({ message: 'Transaction not found' });
        }
        if (transaction.status === 'Pending') {
            return res.status(400).json({ message: 'Transaction is already pending' });
        }
        if (transaction.status === 'Approved') {
            const user = await User.findById(transaction.userId);
            if (!user) {
                return res.status(400).json({ message: 'User associated with this transaction not found!' });
            }
            if (!user.wallet) user.wallet = { realBalance: 0, bonusBalance: 0 };
            user.wallet.realBalance += transaction.amount;
            await user.save();
            return res.status(400).json({ message: 'Transaction already approved' });
        }
        transaction.status = status;
        await transaction.save();
        return res.status(200).json({ message: `Deposit ${status.toLowerCase()} successfully!`, transaction });
    } catch (error) {
        res.status(500).json({ message: 'Internal server error', error: error.message });
    }
}

export const getAllPendingDeposits = async (req, res) => {
    try {
        const pendingDeposits = await Transaction.find({ type: 'Deposit', status: 'Pending' }).populate('userId', 'name email').sort({ createdAt: -1 });
        res.status(200).json({ pendingDeposits });
    } catch (error) {
        res.status(500).json({ message: 'Internal server error', error: error.message });
    }
}

export const allTransaction = async (req, res) => {
    try {
        const transactions = await Transaction.find().populate('userId', 'name email').sort({ createdAt: -1 });
        res.status(200).json({ transactions });
    } catch (error) {
        res.status(500).json({ message: 'Internal server error', error: error.message });
    }
}   


export const createWithdrawalRequest = async (req, res) => {
    try {
        const userId = req.userId || req.body.userId; // Default mapping
        const { amount, method, transactionId, accountDetails } = req.body;
        if (!userId || !amount || !method || !transactionId || !accountDetails) {
            return res.status(400).json({ message: 'All fields are required' });
        }
        const user = await User.findById(userId);
        if (!user) {
            return res.status(400).json({ message: 'User not found' });
        }
        if (!user.wallet) user.wallet = { realBalance: 0, bonusBalance: 0 };
        const currentBalance = user.wallet.realBalance || 0;

        if (currentBalance < amount) {
            return res.status(400).json({ message: 'Insufficient balance' });
        }
        user.wallet.realBalance -= amount;
        await user.save();

        const transaction = await Transaction.create({ userId, type: 'Withdrawal', amount, method, transactionId, accountDetails, status: 'Pending' });
        res.status(201).json({ message: 'Withdrawal request submitted successfully!', transaction });
       
    } catch (error) {
        res.status(500).json({ message: 'Internal server error', error: error.message });
    }
}

export const updateWithdrowalStatus =async(req,res)=>{
    try {
        const { transactionId, status } = req.body; 
    
        if (!['Approved', 'Rejected'].includes(status)) {
          return res.status(400).json({ message: "Invalid status!" });
        }
    
        const transaction = await Transaction.findById(transactionId);
        if (!transaction) return res.status(404).json({ message: "Transaction not found!" });
    
        if (transaction.status !== 'Pending') {
          return res.status(400).json({ message: `This transaction is already ${transaction.status}.` });
        }
    
        const user = await User.findById(transaction.userId);
        if (!user) return res.status(404).json({ message: "User not found!" });
    
        // --- LOGIC FOR DEPOSIT ---
        if (transaction.type === 'Deposit') {
          if (status === 'Approved') {
            if (!user.wallet) user.wallet = { realBalance: 0, bonusBalance: 0 };
            user.wallet.realBalance += transaction.amount; // Deposit approve hua toh paise add karo
          }
          // Agar reject hua toh kuch nahi karna, bas status update hoga
        } 
        
        // --- LOGIC FOR WITHDRAWAL ---
        else if (transaction.type === 'Withdrawal') {
          if (status === 'Rejected') {
            // Agar admin ne withdrawal reject kiya, toh user ke kaate hue paise wapas (refund) kar do
            if (!user.wallet) user.wallet = { realBalance: 0, bonusBalance: 0 };
            user.wallet.realBalance += transaction.amount; 
          }
          // Agar approve hua toh kuch nahi karna kyunki paise hum request ke time hi kaat chuke hain
        }
    
        await user.save(); // User ka naya balance save karein
    
        transaction.status = status;
        await transaction.save(); // Transaction status update karein
    
        res.status(200).json({ 
          message: `${transaction.type} ${status.toLowerCase()} successfully!`, 
          transaction 
        });
    
      } catch (error) {
        console.error("Update Transaction Error:", error);
        res.status(500).json({ message: "Server error while updating transaction." });
      }
}

export const getAllPendingWithdrawals = async (req, res) => {
    try {
      const pendingWithdrawals = await Transaction.find({ type: 'Withdrawal', status: 'Pending' })
        .populate('userId', 'name mobile')
        .sort({ createdAt: -1 });
  
      res.status(200).json(pendingWithdrawals);
    } catch (error) {
      console.error("Get Pending Withdrawals Error:", error);
      res.status(500).json({ message: "Server error while fetching requests." });
    }
  };


  export const getAllWithdrawals = async (req, res) => {
    try {
      const withdrawals = await Transaction.find({ type: 'Withdrawal' })
        .populate('userId', 'name mobile')
        .sort({ createdAt: -1 });
  
      res.status(200).json(withdrawals);
    } catch (error) {
      console.error("Get Withdrawals Error:", error);
      res.status(500).json({ message: "Server error while fetching requests." });
    }
  };
const MeetingHistory = require('../../model/schema/meeting')
const mongoose = require('mongoose');

const add = async (req, res) => {
    try {
        let { agenda, attendes, attendesLead, location, related, dateTime, notes, createBy } = req.body;

        // Validate createBy
        if (createBy && !mongoose.Types.ObjectId.isValid(createBy)) {
            return res.status(400).json({ error: 'Invalid createBy value' });
        }

        // Validate attendes
        if (attendes && !Array.isArray(attendes)) {
            return res.status(400).json({ error: 'attendes must be an array' });
        }
        

        // Validate attendesLead
        if (attendesLead && !Array.isArray(attendesLead)) {
            return res.status(400).json({ error: 'attendesLead must be an array' });
        }
        

        const meeting = new MeetingHistory({
            agenda,
            attendes,
            attendesLead,
            location,
            related,
            dateTime,
            notes,
            createBy
        });

        await meeting.save();
        res.status(200).json(meeting);
    } catch (err) {
        console.error('Failed to create meeting:', err);
        res.status(500).json({ error: 'Failed to create meeting' });
    }
};

 

const index = async (req, res) => {
    query = req.query;

    query.deleted = false;
   if (query.createBy) {
           query.createBy = new mongoose.Types.ObjectId(query.createBy);
       }
   
    try {
     
        let result = await MeetingHistory.aggregate([
            { $match: query },
            {
                $lookup: {
                    from: "users",
                    localField: "createBy",
                    foreignField: "_id",
                    as: "users"
                }
            },
            {
                $lookup: {
                    from: "Contacts",
                    localField: "attendes",
                    foreignField: "_id",
                    as: "contacts"
                }
            },
            {
                $lookup: {
                    from: "Leads",
                    localField: "attendesLead",
                    foreignField: "_id",
                    as: "leads"
                }
            },
            { $unwind: { path: "$users", preserveNullAndEmptyArrays: true } },
            {
                $addFields: {
                    attendesName: {
                        $cond: {
                            if: { $gt: [{ $size: "$contacts" }, 0] },  
                            then: { $concat: ["$contacts.title", " ", "$contacts.firstName", " ", "$contacts.lastName"] },
                            else: { $arrayElemAt: ["$leads.leadName", 0] }  
                        }
                    },
                    createByName: "$users.username"
                }
            },
            {
                $project: {
                    users: 0,
                    contacts: 0,
                    leads: 0
                }
            }
        ]);
        

        res.send(result);
    } catch (err) {
        console.error("Error:", error);
        res.status(500).send("Internal Server Error");
    }
};

const view = async (req, res) => {
    try {
        let response = await MeetingHistory.findOne({ _id: req.params.id });
        if (!response) return res.status(404).json({ message: "no Data Found." });
        let result = await MeetingHistory.aggregate([
            { $match: { _id: new mongoose.Types.ObjectId(req.params.id) } },
            {
                $lookup: {
                    from: 'users',
                    localField: 'createBy',
                    foreignField: '_id',
                    as: 'users'
                }
            },
            {
                $lookup: {
                    from: 'Contacts',
                    localField: 'attendes',
                    foreignField: '_id',
                    as: 'contacts'
                }
            },
            {
                $lookup: {
                    from: 'Leads',
                    localField: 'attendesLead',
                    foreignField: '_id',
                    as: 'leads'
                }
            },
            { $unwind: { path: '$users', preserveNullAndEmptyArrays: true } },
            { $unwind: { path: '$contacts', preserveNullAndEmptyArrays: true } },
            { $unwind: { path: '$leads', preserveNullAndEmptyArrays: true } },
            {
                $addFields: {
                    attendesName: {
                        $cond: {
                            if: '$contacts',
                            then: { $concat: ['$contacts.title', ' ', '$contacts.firstName', ' ', '$contacts.lastName'] },
                            else: { $concat: ['$leads.leadName'] }
                        }
                    },
                    createByName: '$users.username',
                }
            },
            { 
                $project: { 
                    users: 0, 
                    contacts: 0, 
                    leads: 0 
                } 
            }
        ]);


        res.status(200).json(result[0]);

    } catch (err) {
        console.error('Error:', err);
        res.status(500).json({ error: 'Failed to retrieve meeting', details: err.message });
    }
};



const deleteData = async (req, res) => {
    try {
        const response = await MeetingHistory.findOne({ _id: req.params.id });
        if (!response) return res.status(404).json({ message: "no Data Found." })
        await MeetingHistory.updateOne(
            { _id: req.params.id },
            { $set: { deleted: true } }
        );
        res.status(200).json({ message: "Data Deleted Successfully" });
    } catch (err) {
        console.error('Failed to delete:', err);
        res.status(400).json({ error: 'Failed to delete : ', err });
    }
}

const deleteMany = async (req, res) => {
    try {

        
        const result = await MeetingHistory.updateMany({ _id: { $in: req.body } }, { $set: { deleted: true } });
        if (result.matchedCount > 0 && result.modifiedCount > 0) {
            return res.status(200).json({ success: true, message: "Data Deleted Successfully", result });
        } else {
            return res.status(404).json({ success: false, message: "No matching records found" });
        }
    } catch (err) {
        res.status(400).json({ success: false, message: "Error deleting data", details: err.message });
    }
};


module.exports = { add, index, view, deleteData, deleteMany }
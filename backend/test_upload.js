import axios from 'axios';
import fs from 'fs';
import FormData from 'form-data';

async function testUpload() {
    try {
        // 1. Log in
        console.log('Logging in...');
        const loginRes = await axios.post('https://lan-messenger-backend.onrender.com/api/auth/login', {
            username: 'testuser',
            password: 'test1234'
        });
        const token = loginRes.data.data.accessToken;
        console.log('Token received:', token.substring(0, 15) + '...');

        // 2. Upload with axios and FormData
        console.log('Uploading file...');
        const formData = new FormData();
        // create a dummy file
        formData.append('file', fs.createReadStream('test_db.js'));

        const uploadRes = await axios.post('https://lan-messenger-backend.onrender.com/api/uploads', formData, {
            headers: {
                Authorization: `Bearer ${token}`,
                ...formData.getHeaders() // In Node.js form-data, we MUST do this. But in browser it's automatic.
            }
        });

        console.log('Upload success:', uploadRes.data);
    } catch (err) {
        console.error('Upload failed!');
        if (err.response) {
            console.error(err.response.status, err.response.data);
        } else {
            console.error(err.message);
        }
    }
}

testUpload();

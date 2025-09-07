"use client"
import React, {useState} from 'react'
import Navbar from '../components/Navbar'
import Link from 'next/link'
import { useSession } from 'next-auth/react'
import { redirect } from 'next/navigation'

function register() {
    const [name, setName] = useState("");
    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");
    const [confirmpassword, setConfirmPassword] = useState("");
    const [error, setError] = useState("");
    const [success, setSuccess] = useState("");
    const {data : session } = useSession();
    if(session){
        redirect("/welcome")
    }


    const handleSubmit = async (e) => {
        e.preventDefault();
        if(password !== confirmpassword){
            setError("Password do not match!");
            return;
        }
        if(!name || !email || !password || !confirmpassword){
            setError("Please complete all inputs!");
            return;
        }
        try {
            const resCheckUser = await fetch("http://localhost:3000/api/checkUser",{
                method: "POST",
                headers: {
                    "Content-Type" : "application/json"
                },
                body: JSON.stringify({email})
            })
            const { user } = await resCheckUser.json();
            if(user){
                setError("User already exists!");
                return;
            }
            
            const res = await fetch("http://localhost:3000/api/register", {
                method: "POST",
                headers: {
                    "Content-Type" : "application/json"
                },
                body: JSON.stringify({
                    name, email, password
                })

            })
            if(res.ok){
                const form = e.target;
                setError("");
                setSuccess("User registration successfully!");
                form.reset();
            }else{
                console.log("User registration failed.")
            }
        } catch (error) {
            console.log("Error while registration: ", error);
        }
    }
  return (
    <div>
      <Navbar />
      <div className='container mx-auto py-5'>
        <h3>Register Page</h3>
        <hr className='my-3'/>
        <form onSubmit={handleSubmit}>
            {error && (
                <div className='bg-red-500 w-fit text-white text-sm py-1 px-3 rounded-md mt-2'>
                    {error}
                </div>
            )}
            {success && (
                <div className='bg-green-500 w-fit text-white text-sm py-1 px-3 rounded-md mt-2'>
                    {success}
                </div>
            )}
            <input onChange={(e) => setName(e.target.value)} className='block bg-gray-300 p-2 my-2 rounded-md' type="text" placeholder='Enter your name'/>
            <input onChange={(e) => setEmail(e.target.value)} className='block bg-gray-300 p-2 my-2 rounded-md' type="email" placeholder='your@email.com'/>
            <input onChange={(e) => setPassword(e.target.value)} className='block bg-gray-300 p-2 my-2 rounded-md' type="password" placeholder='Enter your password'/>
            <input onChange={(e) => setConfirmPassword(e.target.value)} className='block bg-gray-300 p-2 my-2 rounded-md' type="password" placeholder='Confirm your password'/>
            <button type='submit' className='bg-black p-2 rounded-md text-white' >Sign Up</button>
            <hr className='my-3'/>
            <p>Already have an account? go to <Link className='text-blue-500 underline' href="/login">Log In </Link>Page</p>
        </form>
      </div>
    </div>
  )
}

export default register

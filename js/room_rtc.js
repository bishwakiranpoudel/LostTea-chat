const APP_ID ='e6634d0a8a8c41228234dcf855190120'

let uid = sessionStorage.getItem('uid')
if(!uid){
    uid = String(Math.floor(Math.random()*10000))
    sessionStorage.setItem('uid',uid)

}

let token = null;
let client;

let rtmCLient;
let channel;

const queryString = window.location.search
const urlParams = new URLSearchParams(queryString)
let roomId = urlParams.get('room')

if(!roomId){
    roomId ='main'
}
let displayName = localStorage.getItem('display_name')
if(!displayName){
    window.location = 'index.html'
}

let localTracks = []
let remoteUsers = {}

let localAudioLevel;

let localScreenTracks;
let sharingScreen = false;

let joinRoomInit = async () =>{
    rtmCLient = await AgoraRTM.createInstance(APP_ID)
    await rtmCLient.login({uid,token})

    await rtmCLient.addOrUpdateLocalUserAttributes({'name':displayName})

    channel = await rtmCLient.createChannel(roomId)
    await channel.join()

    channel.on('MemberJoined', handelMemberJoined)
    channel.on('MemberLeft', handelMemberLeft)
    channel.on('ChannelMessage', handelChannelMessage)
    

    getMembers()
    addBotMessageToDom(`A wild ${displayName} has appeared!👋`)


    client= AgoraRTC.createClient({mode:'rtc', codec:'vp8'})
    await client.join(APP_ID, roomId, token, uid)

    client.on('user-published', handleUserPublished)
    client.on('user-left', handleUserLeft)

    
}

let joinStream = async () => {
    document.getElementById('join-btn').style.display ='none'
    document.getElementsByClassName('stream__actions')[0].style.display ='flex'
    

    localTracks = await AgoraRTC.createMicrophoneAndCameraTracks({}, {encoderConfig:{
        width:{min:640, ideal:1920, max:1920},
        height:{min:480, ideal:1080, max:1080}
    }})

    let player = `<div class="video__container" id="user-container-${uid}">
                <div class='video-player' id = 'user-${uid}'></div>
                </div>`
    
    document.getElementById('streams__container').insertAdjacentHTML('beforeend',player)
    document.getElementById(`user-container-${uid}`).addEventListener('click', expandVideoFrame)

    localTracks[1].play(`user-${uid}`)

    await client.publish([localTracks[0],localTracks[1]])
    setInterval(listenLocalAudioLevel, 100);
}


let listenLocalAudioLevel = ()=>{
    
   localAudioLevel= localTracks[0].getVolumeLevel()
   
   if(localAudioLevel>0.18){
    let pxChange= localAudioLevel*20
   
   let container = document.getElementById(`user-container-${uid}`)
   container.style.boxShadow =  `0px 0px ${pxChange}px ${pxChange/10}px rgba(16, 107, 249, 0.6)`
   }
   
}

let switchToCamera = async () => {
    let player = `<div class="video__container" id="user-container-${uid}">
    <div class='video-player' id = 'user-${uid}'></div>
    </div>`
    displayFrame.insertAdjacentHTML('beforeend',player)

    await localTracks[0].setMuted(true)
    await localTracks[1].setMuted(true)

    document.getElementById('mic-btn').classList.remove('active')
    document.getElementById('screen-btn').classList.remove('active')

    localTracks[1].play(`user-${uid}`)
    await client.publish([localTracks[1]])
}

let handleUserPublished = async (user, mediaType) =>{
    remoteUsers[user.uid] = user

    await client.subscribe(user,mediaType)

    let player = document.getElementById(`user-container-${user.uid}`)
    
    if(player=== null){
        player = `<div class="video__container" id="user-container-${user.uid}">
    <div class='video-player' id = 'user-${user.uid}'></div>
    </div>`

    document.getElementById('streams__container').insertAdjacentHTML('beforeend',player)
    document.getElementById(`user-container-${user.uid}`).addEventListener('click', expandVideoFrame)
    }

    if(displayFrame.style.display){
        let videoFrame = document.getElementById(`user-container-${user.uid}`)
        videoFrame.style.height = '100px'
        videoFrame.style.width = '100px'

    }

    if(mediaType === 'video'){
        user.videoTrack.play(`user-${user.uid}`)
    }
    if(mediaType === 'audio'){
        user.audioTrack.play(`user-${user.uid}`)
    }
    
    listenRemoteAudioLevel(user);
     

}

let listenRemoteAudioLevel =  (user)=>{
    let id = user.id;
    setInterval(()=>{
    let AudioLevel= user.audioTrack.getVolumeLevel()
    let pxChange= AudioLevel*40
    
    let container = document.getElementById(`user-container-${user.uid}`)
    
    container.style.boxShadow =  `0px 0px ${pxChange}px ${pxChange/10}px rgba(165,42,202,0.6)`
    },100)
    
    
    
 }

let handleUserLeft = async (user)=>{
    delete remoteUsers[user.uid]
    let item = document.getElementById(`user-container-${user.uid}`)

    if(item){
        item.remove()
    }

    if(userIdInDisplayFrame === `user-container-${user.uid}`){
        displayFrame.style.display = null

        let videoFrames = document.getElementsByClassName('video__container')

        for(let i = 0; videoFrames.length >i; i++){
            videoFrames[i].style.height =' 300px'
            videoFrames[i].style.width =' 300px'
        }
    }
}

let toggleMic = async (e) =>{
    let button = e.currentTarget 

    if(localTracks[0].muted){
        await localTracks[0].setMuted(false)
        button.classList.add('active')
    }else{
        await localTracks[0].setMuted(true)
        button.classList.remove('active')
    }
}

let toggleCamera = async (e) =>{
    let button = e.currentTarget

    if(localTracks[1].muted){
        await localTracks[1].setMuted(false);
        button.classList.add('active');
    }else{
        await localTracks[1].setMuted(true);
        button.classList.remove('active');
    }
}

let toggleScreen = async (e) => {
    let screenButton = e.currentTarget
    let cameraButton = document.getElementById('camera-btn')

    if(!sharingScreen){
        sharingScreen = true

        screenButton.classList.add('active')
        cameraButton.classList.remove('active')
        cameraButton.style.display ='none'

        localScreenTracks = await AgoraRTC.createScreenVideoTrack()

        document.getElementById(`user-container-${uid}`).remove()
        displayFrame.style.display = 'block'

        let player = `<div class="video__container" id="user-container-${uid}">
                <div class='video-player' id = 'user-${uid}'></div>
                </div>`
        
        displayFrame.insertAdjacentHTML('beforeend',player)
        document.getElementById(`user-container-${uid}`).addEventListener('click', expandVideoFrame)

        userIdInDisplayFrame = `user-container-${uid}`
        localScreenTracks.play(`user-${uid}`)

        await client.unpublish([localTracks[1]])
        await client.publish([localScreenTracks])
        let videoFrames = document.getElementsByClassName('video-container')
        for(let i = 0; videoFrames.length > i; i++){
            if(videoFrames[i].id !=userIdInDisplayFrame){
              videoFrames[i].style.height ='100px'
            videoFrames[i].style.width ='100px'
            }
            
          }


    }else{
        sharingScreen = false  
        cameraButton.style.display ='block'
        document.getElementById(`user-container-${uid}`).remove()
        await client.unpublish([localScreenTracks])

        switchToCamera()
    }

}

let leaveStream = async (e) => {
    e.preventDefault()

    document.getElementById('join-btn').style.display ='block'
    document.getElementsByClassName('stream__actions')[0].style.display ='none'

    for( let i= 0 ; localTracks.length>i;i++){
        localTracks[i].stop()
        localTracks[i].close()

    }

    await client.unpublish([localTracks[0],localTracks[1]])
    if(localScreenTracks){
        await client.unpublish([localScreenTracks])
    }

    document.getElementById(`user-container-${uid}`).remove()

    if(userIdInDisplayFrame === `user-container-${uid}`){
        displayFrame.style.display=null
        for(let i = 0; videoFrames.length > i; i++){    
            videoFrames[i].style.height ='300px'
            videoFrames[i].style.width ='300px'    
          }
    }
    channel.sendMessage({text:JSON.stringify({'type':'user_left', 'uid':uid})})
}

document.getElementById('camera-btn').addEventListener('click',toggleCamera)
document.getElementById('mic-btn').addEventListener('click',toggleMic)
document.getElementById('screen-btn').addEventListener('click',toggleScreen)
document.getElementById('join-btn').addEventListener('click',joinStream)
document.getElementById('leave-btn').addEventListener('click',leaveStream)
joinRoomInit()
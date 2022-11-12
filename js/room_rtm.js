let replyTo={};
let replying=false;

let handelMemberJoined = async (MemberId) => {
    console.log('A new member has joined the room', MemberId)
    addMemberToDom(MemberId)

    let members = await channel.getMembers()
    updateMemberTotal(members)

    let { name } = await rtmCLient.getUserAttributesByKeys(MemberId, ['name'])

    addBotMessageToDom(`A wild ${name} has appeared!👋`)
}


let addMemberToDom = async (MemberId) => {
    let { name } = await rtmCLient.getUserAttributesByKeys(MemberId, ['name'])

    let membersWrapper = document.getElementById('member__list')
    let memberItem = ` <div class="member__wrapper" id="member__${MemberId}__wrapper">
                        <span class="green__icon"></span>
                        <p class="member_name">${name}</p>
                        </div>`
    membersWrapper.insertAdjacentHTML('beforeend', memberItem)

}

let updateMemberTotal = async (members) => {
    let total = document.getElementById('members__count')
    total.innerText = members.length
}

let handelMemberLeft = async (MemberId) => {
    removeMemberFromDom(MemberId)
    let members = await channel.getMembers()
    updateMemberTotal(members)
}

let removeMemberFromDom = async (MemberId) => {
    let memberWrapper = document.getElementById(`member__${MemberId}__wrapper`)
    let name = memberWrapper.getElementsByClassName('member_name')[0].textContent
    memberWrapper.remove()

    addBotMessageToDom(`${name} has left the room!😭`)
}

let getMembers = async () => {
    let members = await channel.getMembers()

    updateMemberTotal(members)

    for (let i = 0; members.length > i; i++) {
        addMemberToDom(members[i])
    }
}

let handelChannelMessage = async (messageData, MemberId) => {
    console.log('A new message was received')
    let data = JSON.parse(messageData.text)

    if (data.type === 'chat') {
        addMessageToDom(data.displayName, data.message)
    }
    if (data.type === 'user_left') {
        document.getElementById(`user-container-${data.uid}`).remove()
    }
    if(data.type === 'image'){
        addImageToDom(data.displayName,data.image)
    }
    if(data.type === 'reply'){
        addReplyToDom(data.displayName,data.message,data.repliedName,data.repliedMessage)
    }

}

let sendMessage = async (e) => {
    e.preventDefault()
    console.log(replying)
    if(replying){
        let message = e.target.message.value
        channel.sendMessage({ text: JSON.stringify({ 'type': 'reply', 'message': message, 'displayName': displayName, 'repliedName':replyTo.name, 'repliedMessage':replyTo.message}) })
        addReplyToDom(displayName, message, replyTo.name, replyTo.message)
        replyTo= {}
        document.getElementById('reply__wrapper').innerHTML=null;
        
        
    }
    else{
        if (e.target.image.value) {
            console.log(e)
            let fileInput = document.getElementById('image')
            console.log(fileInput.files[0])
            let file = fileInput.files[0]
            if (file && file['type'].split('/')[0] === 'image') {
                let reader = new FileReader()
    
                reader.addEventListener('load',async () => {
                   let finalImage=await resizeImage(reader.result)
                   console.log(finalImage)
                    channel.sendMessage({ text: JSON.stringify({ 'type': 'image', 'image': finalImage, 'displayName': displayName }) })
                    addImageToDom(displayName,finalImage)
                })
                reader.readAsDataURL(file)
                
                
            }
    
    
        }
        else{
            let message = e.target.message.value
        channel.sendMessage({ text: JSON.stringify({ 'type': 'chat', 'message': message, 'displayName': displayName }) })
        addMessageToDom(displayName, message)
        
        
        }
    }
    e.target.reset()
    replying=false
}

const resizeImage = (base64Str, maxWidth = 400, maxHeight = 350) => {
    return new Promise((resolve) => {
      let img = new Image()
      img.src = base64Str
      img.onload = () => {
        let canvas = document.createElement('canvas')
        const MAX_WIDTH = maxWidth
        const MAX_HEIGHT = maxHeight
        let width = img.width
        let height = img.height
  
        if (width > height) {
          if (width > MAX_WIDTH) {
            height *= MAX_WIDTH / width
            width = MAX_WIDTH
          }
        } else {
          if (height > MAX_HEIGHT) {
            width *= MAX_HEIGHT / height
            height = MAX_HEIGHT
          }
        }
        canvas.width = width
        canvas.height = height
        let ctx = canvas.getContext('2d')
        ctx.drawImage(img, 0, 0, width, height)
        resolve(canvas.toDataURL("image/webp"))
      }
    })
  }

let addMessageToDom = (name, message) => {
    let messagesWrapper = document.getElementById('messages')

    let newMessage = `<div class="message__wrapper">
        <div class="message__body">
        <strong class="message__author">${name}</strong>
        <p class="message__text">${message}</p>
        <div class="reply" onclick="setReplying('${name.split(' ')[0]}' , '${message}')" ><img src='./images/reply.png'></div>
        </div>
        </div>`
    messagesWrapper.insertAdjacentHTML('beforeend', newMessage)

    let lastMessage = document.querySelector('#messages .message__wrapper:last-child')
    if (lastMessage) { lastMessage.scrollIntoView() }

}

let addReplyToDom = (name, message, replyName, replyMessage) => {
    let messagesWrapper = document.getElementById('messages')

    let newMessage = `<div class="message__wrapper" style="display:block;  ">
    <div class="message__body" style ='opacity:0.4; position:relative'><strong class="message__author">${replyName}</strong><p class="message__text">${replyMessage}</p></div>
        <div class="message__body style="z-index: 9999  "">
        <strong class="message__author">${name} replied to ${replyName}</strong>
        <p class="message__text">${message}</p>
        <div class="reply" onclick="setReplying('${name.split(' ')[0]}' , '${message}')" ><img src='./images/reply.png'></div>
        
        </div>
        </div>`
    messagesWrapper.insertAdjacentHTML('beforeend', newMessage)

    let lastMessage = document.querySelector('#messages .message__wrapper:last-child')
    if (lastMessage) { lastMessage.scrollIntoView() }

}


let setReplying = (name,message) =>{
    let replyWrapper = document.getElementById('reply__wrapper')

    let reply = `
    <div class="message__body" style='
    border-bottom-left-radius: 0px;
    border-bottom-right-radius: 0px;
    margin-left: 5px;
    padding: 5px 13px;
'>
        <strong class="message__author" style='color:Red !important'>Replying to ${name}</strong>
    </div>
        
        
        `
    replyWrapper.innerHTML = reply;
    replyTo={'name':name,'message':message}
    replying=true
    console.log(replying)
}

let addImageToDom = (name, image) => {
    let messagesWrapper = document.getElementById('messages')

    let newMessage = `<div class="message__wrapper">
        <div class="message__body">
        <strong class="message__author">${name}</strong>
        
        <img src='${image}' class="message__image">
       
        </div>
        </div>`
    messagesWrapper.insertAdjacentHTML('beforeend', newMessage)

    let lastMessage = document.querySelector('#messages .message__wrapper:last-child')
    if (lastMessage) { lastMessage.scrollIntoView() }

}

let addBotMessageToDom = (botMessage) => {
    let messagesWrapper = document.getElementById('messages')

    let newMessage = `<div class="message__wrapper">
                        <div class="message__body__bot">
                            <strong class="message__author__bot">🤖 Lusty Jr. </strong>
                            <p class="message__text__bot">${botMessage}</p>
                            </div></div>`
    messagesWrapper.insertAdjacentHTML('beforeend', newMessage)

    let lastMessage = document.querySelector('#messages .message__wrapper:last-child')
    if (lastMessage) { lastMessage.scrollIntoView() }

}



let leaveChannel = async () => {
    await channel.leave()
    await rtmCLient.logout()
}

window.addEventListener('beforeunload', leaveChannel)
let messageForm = document.getElementById('message__form')
messageForm.addEventListener('submit', sendMessage)
import Message from "../models/messageModel.js";
import User from "../models/userModel.js";
import Chat from "../models/chatModel.js";
import { sendMessageToChatBot } from "../utils/chatBot.js";
import { uploadToCloudStorage } from "../utils/cloudStorage.js";
import { sendAudioToSpeechToText } from "../utils/speechToText.js";

const send = async (sender, message, chatId, type="text") => {
  try {
    let msg = await Message.create({ sender, message, chatId, type });
    msg = await (
      await msg.populate("sender", "name profilePic email")
    ).populate({
      path: "chatId",
      select: "chatName isGroup users",
      model: "Chat",
      populate: {
        path: "users",
        select: "name email profilePic",
        model: "User",
      },
    });
    await Chat.findByIdAndUpdate(chatId, {
      latestMessage: msg,
    });
    return {success: true, msg}
  } catch (error) {
    return {success: false, error}
  }
}

export const sendMessage = async (req, res) => {
  const { chatId, message } = req.body;
  const chat = await Chat.findById(chatId);
  const userId = chat.users.find(item => JSON.stringify(item) !=JSON.stringify(req.rootUserId));
  const user = await User.findById(userId);
  if (user.name === "Chat Bot") {
    const parsedMessage = JSON.parse(message);
    try {
    const serverlessResponse = await sendMessageToChatBot(parsedMessage.action, parsedMessage.image ?? null);
    console.log(serverlessResponse)
    const sendData = await send(req.rootUserId, parsedMessage.action, chatId);
    const getData = await send(userId, serverlessResponse, chatId);
    if (sendData.success && getData.success) {
    res.status(200).send([sendData.msg, getData.msg]); 
    } else {
      console.log("sendData", sendData);
      console.log("getData", getData)
      res.status(500).send(sendData.error ?? getData.error);
    }

    }
     catch (error) {
      console.log("error is", error)
      res.status(500).send({error});
    }
    return;
  }

   if (req.body.type === "audio") {
    const [uri, url] = await uploadToCloudStorage(message, "mp3", true);
    const transcription = await sendAudioToSpeechToText(uri);
    const response = await send(req.rootUserId, JSON.stringify({url, transcription}), chatId, "audio");
    if (response.success) {
      res.status(200).send(response.msg);
  
    } else {
      res.status(500).send(response.error);
    }
    return;
  }
  const response = await send(req.rootUserId, message, chatId);
  if (response.success) {
    res.status(200).send(response.msg);

  } else {
    res.status(500).send(response.error);
  }
  
};
export const getMessages = async (req, res) => {
  const { chatId } = req.params;
  try {
    let messages = await Message.find({ chatId })
      .populate({
        path: "sender",
        model: "User",
        select: "name profilePic email",
      })
      .populate({
        path: "chatId",
        model: "Chat",
      });

    res.status(200).json(messages);
  } catch (error) {
    res.sendStatus(500).json({ error: error });
    console.log(error);
  }
};

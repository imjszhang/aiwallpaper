import { respData, respErr } from "@/lib/resp";
import { User } from "@/types/user";
import { Wallpaper } from "@/types/wallpaper";
import { currentUser } from "@clerk/nextjs";
import { downloadAndUploadImage } from "@/lib/s3";
import { getDifyClient } from "@/services/dify";
import { getUserCredits } from "@/services/order";
import { insertWallpaper } from "@/models/wallpaper";
import { saveUser } from "@/services/user";
import { downloadImage } from "@/lib/downloadImage";

export async function POST(req: Request) {
  const client = getDifyClient();

  const user = await currentUser();
  if (!user || !user.emailAddresses || user.emailAddresses.length === 0) {
    return respErr("no auth");
  }

  try {
    const { description } = await req.json();
    if (!description) {
      return respErr("invalid params");
    }

    // Save user information
    const user_email = user.emailAddresses[0].emailAddress;
    const nickname = user.firstName;
    const avatarUrl = user.imageUrl;
    const userInfo: User = {
      email: user_email,
      nickname: nickname || "",
      avatar_url: avatarUrl,
    };
    await saveUser(userInfo);

    // Check user credits
    const user_credits = await getUserCredits(user_email);
    if (!user_credits || user_credits.left_credits < 1) {
      return respErr("credits not enough");
    }

    // Define image generation parameters
    const img_size = "1792x1024";
    const dify_params = {
      prompt: `generate desktop wallpaper image about ${description}`,
      size: img_size,
    };

    // Generate image using Dify
    const res = await client.sendMessage({
      query: dify_params.prompt,
      responseMode: "blocking",
      user: user_email,
    });

    // Extract image URL from the response
    //const raw_img_url = res?.message_files?.[0]?.url;
    //if (!raw_img_url) {
    //  return respErr("generate wallpaper failed");
    //}
    // 从 res.answer 中提取第一个 URL
    const messageContent = res?.answer || ""; // 获取 res.answer 的内容
    const urlRegex = /(https?:\/\/[^\s]+)/; // 匹配 URL 的正则表达式
    const match = messageContent.match(urlRegex); // 提取第一个匹配的 URL
    const raw_img_url = match ? match[0] : null; // 如果匹配到 URL，则取第一个，否则为 null

    if (!raw_img_url) {
        return respErr("generate wallpaper failed");
    }

    /*
    // Upload the generated image to S3
    const img_name = encodeURIComponent(description);
    const s3_img = await downloadAndUploadImage(
      raw_img_url,
      process.env.AWS_BUCKET || "trysai",
      `wallpapers/${img_name}.png`
    );
    const img_url = s3_img.Location;
    */
    // Save the generated image to local file system
    const img_name = encodeURIComponent(description);
    const local_path = `./wallpapers/${img_name}.png`;
    await downloadImage(raw_img_url, local_path);
    const img_url = `http://localhost:3000/wallpapers/${img_name}.png`;


    // Save wallpaper information to the database
    const wallpaper: Wallpaper = {
      user_email: user_email,
      img_description: description,
      img_size: img_size,
      img_url: img_url,
      llm_name: "dify",
      llm_params: JSON.stringify(dify_params),
      created_at: new Date().toISOString(),
    };
    await insertWallpaper(wallpaper);

    return respData(wallpaper);
  } catch (e) {
    console.error(e);
    return respErr("generate wallpaper failed");
  }
}
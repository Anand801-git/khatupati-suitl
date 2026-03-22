import { NextResponse } from "next/server";
import { exec } from "child_process";

export async function POST(): Promise<NextResponse> {
  if (process.env.NODE_ENV === 'production') {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  return new Promise((resolve) => {
    exec("./deploy.sh", (error, stdout, stderr) => {
      if (error) {
        console.error(`exec error: ${error}`);
        resolve(NextResponse.json({ error: stderr }, { status: 500 }));
        return;
      }
      resolve(NextResponse.json({ success: stdout }));
    });
  });
}
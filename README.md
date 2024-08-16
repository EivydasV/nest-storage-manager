<p align="center">
  <a href="http://nestjs.com/" target="blank"><img src="https://nestjs.com/img/logo-small.svg" width="200" alt="Nest Logo" /></a>
</p>

<p align="center"><b>nest-storage-manager</b></p>
<p align="center">Nestjs file manager</p>

## Description
 **nest-storage-manager** is a convenient utility for managing files, offering a straightforward and efficient way to upload, delete, and organize files. Leveraging Node.js streams under the hood, it ensures fast and reliable performance

## Features
 - Local storage
 - AWS S3 storage
 - Protected from directory traversal attack

## Installation

```bash
$ npm install --save nest-storage-manager
```
or 
```bash
$ yarn add nest-storage-manager
```

### When using AWS S3 storage

You need to install the following packages


```bash
$ npm install --save @aws-sdk/lib-storage @aws-sdk/client-s3
```
or 
```bash
$ yarn add @aws-sdk/lib-storage @aws-sdk/client-s3
```

## Usage

To use nest-storage-manager, you need to register the module in your application.
```ts
import { StorageEnum, StorageModule } from 'nest-storage-manager';

@Module({
  imports: [StorageModule.register([
    {
      name: 'uploads', // storage name is used to inject the storage into the constructor
      storage: StorageEnum.LOCAL, //storage type for now only local is supported
      options: {
        rootPath: process.cwd(), // root path of the storage this is optional and defaults to process.cwd(). This is usefull when you don't want to upload files to the root of the project
        path: 'uploads', // path to the storage directory. this will append to the rootPath. In this case the path will be `process.cwd()/uploads`
        
      },
    },
  ])
  ],
})
export class AppModule {}
```
you can also register multiple storages 
```ts
import { StorageEnum, StorageModule } from 'nest-storage-manager';

@Module({
  imports: [StorageModule.register([
    {
      name: 'uploads', 
      storage: StorageEnum.LOCAL, 
      options: {
        rootPath: process.cwd(),
        path: 'uploads', 
        
      },
    },
    {
      name: 's3',
      storage: StorageEnum.AWS_S3,
      options: {
        credentials: {
          accessKeyId: 'accessKeyId',
          secretAccessKey: 'secretAccessKey',
        },
        region: 'us-east-1',
        Bucket: 'nest-storage-manager',
      },
    },
    ])
  ],
})
export class AppModule {}
```
or using `registerAsync` method
```ts
import { StorageEnum, StorageModule } from 'nest-storage-manager';

@Module({
  imports: [StorageModule.registerAsync({
    storages: [
      {
        name: 'temp',
        useFactory: () => {
          return {
            storage: StorageEnum.LOCAL,
            options: {
              path: 'storage',
            },
          };
        },
      },
      {
        name: 'storage',
        useFactory: () => {
          return {
            storage: StorageEnum.LOCAL,
            options: {
              path: 'storage',
            },
          };
        },
      },
    ],
  })],
})
export class AppModule {}
```

just make sure that the names are unique.

When only array passed to register method, the storages will be registered only for that module and will not be available globally. If you want to make the storages available globally, you can pass an object with the `isGlobal` property set to true.
```ts
@Module({
  imports: [
    StorageModule.register({
      storages: [
        {
          name: 'test',
          storage: StorageEnum.LOCAL,
          options: {
            path: 'storage',
            rootPath: process.cwd(),
          },
        },
      ],
      isGlobal: true,
    }),
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
```

## Injecting the storage
 You can inject the storage into your service by using the `Inject` decorator. The `Inject` decorator takes the name of the storage as an argument.
```ts
import { LocalStorage } from 'nest-storage-manager';
import { Injectable, Inject } from '@nestjs/common';


@Injectable()
export class AppService {
  constructor(
    @Inject('uploads') private readonly uploads: LocalStorage,
  ) {}
}
```

# Local storage

## Uploading files
To upload a file, you can use the `upload` method of the storage. This method returns the relative path of the uploaded file. There is also `uploadMany` method which accepts an array of files and returns a promise that resolves to an array of relative paths.
```ts
import { Injectable, Inject } from '@nestjs/common';
import { LocalStorage } from 'nest-storage-manager';

@Injectable()
export class AppService {
  constructor(
    @Inject('uploads') private readonly uploads: LocalStorage,
  ) {}

  async uploadFile() {
    const filePath = 'path/to/file.jpg';
    const relativePath = await this.uploads.upload(filePath);
    console.log(relativePath); // uploads/c/c/3/d/8/d/c/6/08393b6b-ae49-43b5-a6b5-40b66d57a611.jpg
    }
  }
```
as you can see in the example above it will generate a unique file name based on the file extension using the `crypto.randomUUID()` function.
And it will generate a random subdirectory for the file. This done to improve file search speed and better scalability.

Fortunately, you can also pass a custom function to generate the file name and subdirectory.
```ts
import { Injectable, Inject } from '@nestjs/common';
import { LocalStorage } from 'nest-storage-manager';
import * as path from 'node:path';

@Injectable()
export class AppService {
  constructor(
    @Inject('uploads') private readonly uploads: LocalStorage,
  ) {}

  async uploadFile() {
    const filePath = 'path/to/file.jpg';
    const relativePath = await this.uploads.upload(filePath, {
      generateUniqueFileName: (fileExtension) => {
        return `unique-file-name${fileExtension}`;
      },
      generateSubDirectories: () => { // you can also pass false instead of a function to disable the subdirectory generation
        return path.join('cool', 'dir');
      }, 
    });
    console.log(relativePath); // uploads/cool/dir/unique-file-name.jpg
  }
}
```
it also accepts `deleteFileOnError` (default: `true`) option which will delete the file if an error occurs while writing it to the storage. So it will prevent the file from being left in a corrupted state.


Passing file path to the `upload` method is not the only way to upload a file. You can also pass a file stream, a buffer, or an url to download a file.

Usage with buffer and multer
```ts
import { Injectable, Inject, UploadedFile } from '@nestjs/common';
import { LocalStorage } from 'nest-storage-manager';
import {  FileInterceptor } from '@nestjs/platform-express';

@Controller()
export class AppService {
  constructor(
    @Inject('uploads') private readonly uploads: LocalStorage,
  ) {}

  @Post()
  @FileInterceptor('file')
  async uploadFile(@UploadedFile() file: Express.Multer.File) {
    const relativePath = await this.uploads.upload(file.buffer);
  }
}
```

Usage with stream
```ts
import { Injectable, Inject } from '@nestjs/common';
import { LocalStorage } from 'nest-storage-manager';
import * as fs from 'node:fs';

@Injectable()
export class AppService {
  constructor(
    @Inject('uploads') private readonly uploads: LocalStorage,
  ) {}

  async uploadFile() {
    const relativePath = await this.uploads.upload(fs.createReadStream('path/to/file.jpg'));
  }
}
```

Usage with url. Downloading a file from an internet.
```ts
import { Injectable, Inject } from '@nestjs/common';
import { LocalStorage } from 'nest-storage-manager';

@Injectable()
export class AppService {
  constructor(
    @Inject('uploads') private readonly uploads: LocalStorage,
  ) {}

  async uploadFile() {
    const relativePath = await this.uploads.upload('https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/BigBuckBunny.mp4');
  }
}
```

## Deleting files
To delete a file, you can use the `delete` method of the storage. This method returns a boolean indicating whether the file was deleted successfully.
```ts
import { Injectable, Inject } from '@nestjs/common';
import { LocalStorage } from 'nest-storage-manager';

@Injectable()
export class AppService {
  constructor(
    @Inject('uploads') private readonly uploads: LocalStorage,
  ) {}

  async deleteFile() {
    const deleted = await this.uploads.delete('uploads/c/c/3/d/8/d/c/6/08393b6b-ae49-43b5-a6b5-40b66d57a611.jpg');
    console.log(deleted); // true 
  }
}
```

## Checking if file exists
To check if a file exists, you can use the `doesFileExist` method of the storage. This method returns a boolean indicating whether the file exists.
```ts
import { Injectable, Inject } from '@nestjs/common';
import { LocalStorage } from 'nest-storage-manager';

@Injectable()
export class AppService {
  constructor(
    @Inject('uploads') private readonly uploads: LocalStorage,
  ) {}

  async checkIfFileExists() {
    const exists = await this.uploads.doesFileExist('uploads/c/c/3/d/8/d/c/6/08393b6b-ae49-43b5-a6b5-40b66d57a611.jpg');
    console.log(exists); // true 
  }
}
```

## Getting file stats
To get file stats, you can use the `getFileStats` method of the storage. This method returns an object containing information about the file.
```ts
import { Injectable, Inject } from '@nestjs/common';
import { LocalStorage } from 'nest-storage-manager';

@Injectable()
export class AppService {
  constructor(
    @Inject('uploads') private readonly uploads: LocalStorage,
  ) {}

  async getFileStats() {
    const stats = await this.uploads.getFileStats('uploads/c/c/3/d/8/d/c/6/08393b6b-ae49-43b5-a6b5-40b66d57a611.jpg');
    console.log(stats);
  }
}
```
response 
```ts
{
    fileName: '10f77d57-00cb-4215-9e89-0b1ce7d7feac.gz',
    absolutePath: '/home/user/Desktop/coding/test-project/uploads/c/d/a/a/d/9/6/d/10f77d57-00cb-4215-9e89-0b1ce7d7feac.gz',
    relativePath: 'uploads/c/d/a/a/d/9/6/d/10f77d57-00cb-4215-9e89-0b1ce7d7feac.gz',
    mimeType: 'application/gzip',
    fileExtension: 'gz',
    stat: Stats {
    dev: 2050,
      mode: 33188,
      nlink: 1,
      uid: 1000,
      gid: 1000,
      rdev: 0,
      blksize: 4096,
      ino: 31616136,
      size: 141440882,
      blocks: 276256,
      atimeMs: 1723191204906.6978,
      mtimeMs: 1723191203506.6848,
      ctimeMs: 1723191203506.6848,
      birthtimeMs: 1723191203506.6848,
      atime: 2024-08-09T08:13:24.907Z,
      mtime: 2024-08-09T08:13:23.507Z,
      ctime: 2024-08-09T08:13:23.507Z,
      birthtime: 2024-08-09T08:13:23.507Z
  }
}
```

## Getting files cursor
To get files cursor, you can use the `getFilesCursor` method of the storage. This will allow you to iterate over all the files in the storage.

```ts
import { Injectable, Inject } from '@nestjs/common';
import { LocalStorage } from 'nest-storage-manager';

@Injectable()
export class AppService {
  constructor(
    @Inject('uploads') private readonly uploads: LocalStorage,
  ) {}

  async getFilesCursor() {
    const cursor = await this.uploads.getFilesCursor();
    for await (const file of cursor) {
      console.log(file); //file stats
    }
  }
}
```

## Copying files
To copy a file, you can use the `copy` method of the storage. For now, it only supports copying to the same storage.
```ts
import { Injectable, Inject } from '@nestjs/common';
import { LocalStorage } from 'nest-storage-manager';

@Injectable()
export class AppService {
  constructor(
    @Inject('uploads') private readonly uploads: LocalStorage,
  ) {}

  async copyFile() {
    const newPath = await this.uploads.copy('uploads/c/c/3/d/8/d/c/6/08393b6b-ae49-43b5-a6b5-40b66d57a611.jpg', 'uploads/c/c/3/d/8/d/c/6/08393b6b-ae49-43b5-a6b5-40b66d57a611-copy.jpg');
    console.log(newPath); // uploads/c/c/3/d/8/d/c/6/08393b6b-ae49-43b5-a6b5-40b66d57a611-copy.jpg
  }
}
```

## Moving files
To move a file, you can use the `move` method of the storage. For now, it only supports moving to the same storage.
```ts
import { Injectable, Inject } from '@nestjs/common';
import { LocalStorage } from 'nest-storage-manager';

@Injectable()
export class AppService {
  constructor(
    @Inject('uploads') private readonly uploads: LocalStorage,
  ) {}

  async moveFile() {
    const newPath = await this.uploads.move('uploads/c/c/3/d/8/d/c/6/08393b6b-ae49-43b5-a6b5-40b66d57a611.jpg', 'uploads/c/c/3/d/8/d/c/6/08393b6b-ae49-43b5-a6b5-40b66d57a611-move.jpg');
    console.log(newPath); // uploads/c/c/3/d/8/d/c/6/08393b6b-ae49-43b5-a6b5-40b66d57a611-move.jpg
  }
}
```

## Using `Many` methods
It has helper methods like `uploadMany`, `deleteMany`, `doesFileExistMany`, `moveMany` and `CopyMany` which accept an array of files and return a promise that resolves to an array of results.
Keep in mind that these methods return `Promise.allSettled()` which means that if one of the files fails to upload, it won't fail the entire operation.
example with `uploadMany`
```ts
import { Injectable, Inject } from '@nestjs/common';
import { LocalStorage } from 'nest-storage-manager';

@Injectable()
export class AppService {
  constructor(
    @Inject('uploads') private readonly uploads: LocalStorage,
  ) {}

  async uploadFiles() {
    const filePaths = ['path/to/file1.jpg', 'path/to/file2.jpg'];
    const uploads = await this.uploads.uploadMany(filePaths, options);
    const isSuccess = uploads.every((item) => item.status === 'fulfilled');
    if (!isSuccess) {
      throw new Error('Upload failed');
    } // ['uploads/c/c/3/d/8/d/c/6/08393b6b-ae49-43b5-a6b5-40b66d57a611.jpg', 'uploads/c/c/3/d/8/d/c/6/08393b6b-ae49-43b5-a6b5-40b66d57a612.jpg']
  }
}
```

## Options
You can access passed options to the storage by using `options` property.

```ts
import { Injectable, Inject } from '@nestjs/common';
import { LocalStorage } from 'nest-storage-manager';

@Injectable()
export class AppService {
  constructor(
    @Inject('uploads') private readonly uploads: LocalStorage,
  ) {}

  async moveFile() {
    const options = await this.uploads.options;
  }
}
```

# AWS S3 storage

When using AWS S3 it will have same methods as local storage but with some differences.
Return types of methods are different from local storage.
Also, options are different. Options are forwarded to aws s3 client.

## Injecting the storage
```ts
import { AwsS3Storage } from 'nest-storage-manager';
import { Injectable, Inject } from '@nestjs/common';


@Injectable()
export class AppService {
  constructor(
    @Inject('s3') private readonly s3Storage: AwsS3Storage,
  ) {}
}
```

## Uploading files
To upload a file, you can use the `upload` method of the storage. Uploading to aws s3 would be a bit different from local storage.
```ts
import { Injectable, Inject } from '@nestjs/common';
import { LocalStorage } from 'nest-storage-manager';

@Injectable()
export class AppService {
  constructor(
    @Inject('uploads') private readonly s3Storage: AwsS3Storage,
  ) {}

  async uploadFile() {
    const filePath = 'path/to/file.jpg';
    const upload = await this.s3Storage.upload(filePath);
    const result = await upload.done()
    }
  }
```
Upload method returns `Upload` object from aws s3 client. You need to call `done` method on the upload object to wait for the upload to complete.
`upload` method has few same options as local storage. That are `generateSubDirectories`, `generateUniqueFileName`, but it also has `cloud` options which will be forwarded to aws s3 client.

## AWS S3 client

You can access aws s3 client by using `client` property.

```ts
import { Injectable, Inject } from '@nestjs/common';
import { LocalStorage } from 'nest-storage-manager';

@Injectable()
export class AppService {
  constructor(
    @Inject('uploads') private readonly s3Storage: AwsS3Storage,
  ) {}

  async test() {
    const client = await this.s3Storage.client;
  }
}
```
This property exposes `S3Client` from `@aws-sdk/client-s3`. It could be usefully, when you want to implement custom method, that is not supported by `nest-storage-manager` or just want to access client directly.

```ts
import { Injectable, Inject } from '@nestjs/common';
import { LocalStorage } from 'nest-storage-manager';
import {
  GetObjectCommand,
} from '@aws-sdk/client-s3';

@Injectable()
export class AppService {
  constructor(
    @Inject('uploads') private readonly s3Storage: AwsS3Storage,
  ) {}

  async test() {
    const client = this.awsS3Storage.client;

    const res = await client.send(
      new GetObjectCommand({ Bucket: 'test-bucket', Key: 'test.txt' }),
    );
  }
}
```

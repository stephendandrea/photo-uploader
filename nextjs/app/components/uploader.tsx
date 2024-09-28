'use client';

import { ChangeEvent, useState } from 'react';

export const Uploader = () => {
  const handleChange = async (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];

    if (file) {
      const request = new Request(
        `https://lmv62409e5.execute-api.us-east-1.amazonaws.com/prod/create-upload-url?key=${file.name}`
      );

      try {
        const res = await fetch(request);
        const body = await res.json();
        const formData = new FormData();

        Object.keys(body.fields).forEach((key) => {
          formData.append(key, body.fields[key]);
        });

        formData.append('file', file);

        const request2 = new Request(body.url, {
          method: 'POST',
          body: formData,
        });

        await fetch(request2);

        console.log('SUCCESS!');
      } catch (e) {
        console.log({ error: e });
      }
    }
  };

  return (
    <>
      <label
        className="block mb-2 text-sm font-medium text-gray-900 dark:text-white"
        htmlFor="file_input"
      >
        Upload file
      </label>
      <input
        className="block w-full text-sm text-gray-900 border border-gray-300 rounded-lg cursor-pointer bg-gray-50 dark:text-gray-400 focus:outline-none dark:bg-gray-700 dark:border-gray-600 dark:placeholder-gray-400"
        id="file_input"
        type="file"
        onChange={handleChange}
      />
    </>
  );
};
